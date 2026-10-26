/**
 * Amplify configuration for the OCC console.
 *
 * Imported once from `main.tsx`, before anything renders — Amplify must be
 * configured before the first `aws-amplify/auth` call, and a module import is
 * the only ordering guarantee that survives bundling.
 *
 * The pool and client ids are not secrets: they ship in the bundle either way.
 * Nothing here may hold an AWS access key or an app-client secret — the client
 * is configured as a public client for exactly that reason.
 */
import { Amplify } from "aws-amplify"
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito"
import { defaultStorage, sessionStorage } from "aws-amplify/utils"

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID

/** False in a demo build with no pool configured, which keeps the app bootable */
export const cognitoConfigured = Boolean(userPoolId && userPoolClientId)

if (cognitoConfigured) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        // The console signs in with an e-mail address, not a separate username
        loginWith: { email: true },
      },
    },
  })
} else if (import.meta.env.DEV) {
  console.warn(
    "[auth] VITE_COGNITO_USER_POOL_ID / VITE_COGNITO_CLIENT_ID are unset — " +
      "sign-in will fail. Set them in .env.local to talk to Cognito."
  )
}

/**
 * Where Amplify keeps its tokens.
 *
 * `defaultStorage` is localStorage: the session survives a browser restart,
 * which is what "Remember Me" means. Without it the tokens live in
 * sessionStorage and die with the tab.
 *
 * Both are readable by script, so this is XSS-exposed by construction — the
 * trade every SPA-side Cognito integration makes. Moving the refresh token to
 * an httpOnly cookie means putting your own API in front of Cognito; worth
 * doing before this holds anything regulated.
 */
export function setTokenStorage(remember: boolean) {
  cognitoUserPoolsTokenProvider.setKeyValueStorage(remember ? defaultStorage : sessionStorage)
}
