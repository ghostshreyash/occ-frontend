import { useCallback, useEffect, useMemo, useState } from "react"

import { endSignOut, setSessionExpiredHandler } from "@/lib/api/client"

import { AuthContext, type AuthContextValue } from "./context"
import { currentUser, signOutCognito } from "./auth-service"
import { setTokenStorage } from "./cognito"
import type { AuthSession, AuthUser, OtpChallenge, ResetContext } from "./types"

const STORAGE_KEY = "occ.session"

/**
 * Session storage policy: "Remember Me" persists across browser restarts in
 * localStorage, otherwise the session dies with the tab (sessionStorage).
 * Pending OTP challenges and reset tokens are deliberately kept in memory only —
 * a refresh mid-flow sends the user back to the start, which is what we want.
 */
function readStoredSession(): AuthSession | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as AuthSession
    } catch {
      // Corrupt or unavailable storage: treat as signed out.
    }
  }
  return null
}

function writeStoredSession(session: AuthSession | null) {
  try {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    if (session) {
      const store = session.remember ? localStorage : sessionStorage
      store.setItem(STORAGE_KEY, JSON.stringify(session))
    }
  } catch {
    // Private-mode browsers: the session simply stays in memory.
  }
}



export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readStoredSession)
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null)
  const [resetContext, setResetContext] = useState<ResetContext | null>(null)

  /*
   * The stored session is a UI convenience — the tokens behind it are Amplify's
   * and can expire or be revoked without this knowing. On boot, ask Cognito who
   * is signed in and drop anything it no longer recognises.
   */
  useEffect(() => {
    let cancelled = false

    /*
     * Amplify's token provider goes back to localStorage on every page load, so
     * a session that asked for sessionStorage has to say so again before the
     * first `fetchAuthSession` below. Skipping this hides those tokens from
     * boot and, worse, points a later sign-out at the wrong store — which would
     * leave a live session behind after the user had logged out.
     */
    const stored = readStoredSession()
    if (stored) setTokenStorage(stored.remember)

    void currentUser().then((user) => {
      if (cancelled) return
      setSession((current) => {
        if (!user) {
          if (current) writeStoredSession(null)
          return null
        }
        // Refresh the profile from the ID token rather than trusting what was stored
        const next: AuthSession = { ...(current ?? { issuedAt: Date.now(), remember: true }), user }
        writeStoredSession(next)
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [])

  /** Drops this tab's session without touching Cognito or the backend */
  const clearLocalSession = useCallback(() => {
    writeStoredSession(null)
    setSession(null)
    setChallenge(null)
    setResetContext(null)
  }, [])

  const signIn = useCallback((user: AuthUser, remember: boolean, brand?: string) => {
    /*
     * The sign-out block stays up from the last logout until here, so a new
     * session is what lifts it. Both ways in — the OTP screen and the forced
     * password change — complete through this one call.
     */
    endSignOut()
    // Decides whether Amplify's tokens outlive the tab, so it must be set first
    setTokenStorage(remember)
    const next: AuthSession = { user, issuedAt: Date.now(), remember, brand }
    writeStoredSession(next)
    setSession(next)
    setChallenge(null)
  }, [])

  // TODO: PATCH /me - for now the edit lives on the session only
  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setSession((current) => {
      if (!current) return current
      const next: AuthSession = { ...current, user: { ...current.user, ...patch } }
      writeStoredSession(next)
      return next
    })
  }, [])

  const signOut = useCallback(async () => {
    /*
     * Clear this tab first so the console is unusable straight away, then wait
     * for the tokens themselves to go. Returning before that resolved was the
     * bug: a reload in the gap found the tokens still in storage and signed the
     * user back in.
     */
    clearLocalSession()
    await signOutCognito()
  }, [clearLocalSession])

  /*
   * The API client reports a session Cognito can no longer refresh. Clear the
   * local state only — Amplify has already decided the tokens are finished, and
   * calling /auth/logout with a dead token would just fail. The route guard
   * sends them to sign-in as soon as the session goes null.
   */
  useEffect(() => {
    setSessionExpiredHandler(clearLocalSession)
    return () => setSessionExpiredHandler(null)
  }, [clearLocalSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      signIn,
      signOut,
      updateUser,
      challenge,
      setChallenge,
      resetContext,
      setResetContext,
    }),
    [session, signIn, signOut, updateUser, challenge, resetContext]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
