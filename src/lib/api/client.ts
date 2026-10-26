/**
 * The OCC API client.
 *
 * Every call carries the Cognito access token as a bearer. Amplify refreshes
 * that token when it is close to expiry, so `accessToken()` is read per request
 * rather than captured once — a long-lived page would otherwise send a stale one.
 *
 * Nothing here sends a password, an OTP, the Cognito sub or a database id: the
 * backend reads identity from the verified token, and anything the client
 * asserted about itself would not be trustworthy anyway. The refresh token never
 * leaves Amplify's storage — only the access token is ever put on a request.
 */
import { accessToken, refreshAccessToken } from "@/lib/auth/auth-service"

/*
 * Undefined means nobody configured an API; empty means "this origin", which is
 * how local work runs (the Vite proxy forwards /api and CORS never applies).
 * The two must stay distinguishable, so this does not collapse to a falsy test.
 */
const RAW = import.meta.env.VITE_API_URL as string | undefined
const BASE = RAW === undefined ? undefined : RAW.replace(/\/+$/, "")

/** A non-2xx response, carrying the status so callers can branch on 404 vs 401 */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown
  /** False for endpoints reachable before sign-in, e.g. registration */
  auth?: boolean
}

/**
 * What to do when Cognito can no longer produce a token — the refresh token has
 * expired or been revoked, so the session is genuinely over.
 *
 * A module-level handler rather than a hook because `apiFetch` is called from
 * plain functions, not components. `AuthProvider` registers the real one on
 * mount; until then an expiry is only logged.
 */
let onSessionExpired: (() => void) | null = null

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

function sessionExpired() {
  if (onSessionExpired) onSessionExpired()
  else console.warn("[api] session expired before a handler was registered.")
}

/**
 * Fetch against the OCC API with the bearer token attached.
 *
 * On a 401 the token is refreshed through Amplify and the request is retried
 * **once**. If the refresh itself fails the session is over and the expiry
 * handler signs the user out; if the retry comes back 401 with a freshly minted
 * token, that is the backend's own authorization decision and is reported as a
 * normal `ApiError` — signing someone out over it would log them out of a
 * console they are legitimately signed in to.
 *
 * Throws `ApiError` on a non-2xx so callers can branch on `status`; a network
 * failure throws status 0, which is how "backend not running" shows up.
 */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (BASE === undefined) throw new ApiError(0, "VITE_API_URL is not set for this environment.")

  const { body, headers, auth = true, ...rest } = options

  const send = async (token: string | null) => {
    try {
      return await fetch(`${BASE}${path}`, {
        ...rest,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
    } catch (e) {
      throw new ApiError(0, e instanceof Error ? e.message : "Could not reach the API.")
    }
  }

  let token: string | null = null
  if (auth) {
    token = await accessToken()
    if (!token) {
      sessionExpired()
      throw new ApiError(401, "Not signed in.")
    }
  }

  let response = await send(token)

  if (response.status === 401 && auth) {
    const fresh = await refreshAccessToken()
    if (!fresh) {
      // Cognito will not issue another token: the session is over, not the request
      sessionExpired()
      throw new ApiError(401, "Your session has expired. Please sign in again.")
    }
    response = await send(fresh)
  }

  // 204 and friends have nothing to parse
  const text = await response.text()
  const parsed: unknown = text ? safeJson(text) : null

  if (!response.ok) {
    const message =
      (parsed as { message?: string })?.message ?? `${response.status} ${response.statusText}`
    throw new ApiError(response.status, message, parsed)
  }

  return parsed as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
