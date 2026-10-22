/**
 * Auth for the OCC console, over Cognito via `aws-amplify/auth`.
 *
 * The pool is configured with e-mail OTP as the MFA factor, so signing in is two
 * calls: `signIn` with the password returns a challenge, `confirmSignIn` with
 * the code completes it. Cognito owns the code, the attempt limit, the expiry
 * and the lockout — nothing here validates anything.
 *
 * One thing to know about Amplify: the challenge is NOT a token you can pass
 * around. Amplify holds the in-flight auth state internally, so `verifyOtp`
 * ignores `challenge.id` and simply answers whatever challenge is open. A page
 * refresh mid-flow therefore drops it and the user starts again — which is what
 * `auth-context` already says it wants.
 */
import {
  confirmResetPassword,
  confirmSignIn,
  confirmSignUp,
  signUp,
  fetchAuthSession,
  resetPassword as cognitoResetPassword,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  updateMFAPreference,
} from "aws-amplify/auth"

import { loadAppUser, syncAppUser } from "./app-user"
import { cognitoConfigured } from "./cognito"
import { type RecoveryRequestInput } from "./requests"
import { AuthError, type AuthUser, type OtpChallenge, type OtpChannel, type OtpPurpose, type ResetContext } from "./types"

/** Digits in a code — keep in step with the Cognito verification message. */
export const OTP_LENGTH = 6
/** Client-side hint only; the authoritative expiry comes back on the challenge. */
export const OTP_TTL_SECONDS = 5 * 60
/** How long the Resend button stays disabled after a send. */
export const RESEND_COOLDOWN_SECONDS = 30

export const CHANNEL_LABEL: Record<OtpChannel, string> = {
  sms: "SMS",
  email: "E-mail",
  voice: "Voice call",
}

/* ------------------------------------------------------------- display ---- */
/* The backend returns destinations already masked. These helpers cover the
   placeholder responses below and any value the UI has to mask locally. */

/** "+919876543210" → "+91 ••••• ••210" */
export function maskPhone(mobile: string) {
  const digits = mobile.replace(/\D/g, "")
  const cc = digits.length > 10 ? `+${digits.slice(0, digits.length - 10)} ` : ""
  return `${cc}••••• ••${digits.slice(-3)}`
}

/** "suresh.kumar@tatasteel.com" → "su••••@tatasteel.com" */
export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@")
  return `${local.slice(0, 2)}${"•".repeat(Math.max(local.length - 2, 2))}@${domain}`
}

/* ----------------------------------------------------------- in flight --- */

/**
 * What the current sign-in attempt needs that Amplify does not hand back.
 *
 * `password` is held only so Resend can re-issue a code: Amplify has no
 * "resend MFA code" call, and the only way to make Cognito send another is to
 * start the sign-in again. It lives in a module variable for the life of the
 * challenge, never in storage, and is cleared the moment the flow ends.
 */
let flow: { username: string; password: string; user?: AuthUser } | null = null

/** Forget the in-flight credentials — call on success, failure and sign-out */
export function clearAuthFlow() {
  flow = null
}

/** The username a password reset is running for, needed by confirmResetPassword */
let resetFor: string | null = null

/** Masked destinations for the account a challenge belongs to */
export function otpDestinations(user?: AuthUser): Partial<Record<OtpChannel, string>> {
  if (!user) return {}
  return { email: maskEmail(user.email), sms: maskPhone(user.mobile), voice: maskPhone(user.mobile) }
}

const pause = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Build the challenge the screens render.
 *
 * `expiresAt` is a client-side countdown only — Cognito does not return the
 * code's TTL, so this is the pool's configured expiry mirrored in `OTP_TTL_SECONDS`.
 * Keep the two in step or the countdown lies.
 *
 * `availableChannels` is just e-mail: the pool has e-mail OTP as its only MFA
 * factor, so the "try another way" link correctly hides itself. Enable SMS MFA
 * too and Cognito starts returning a factor-selection step — handle that in
 * `signIn` before widening this.
 */
function challengeFrom(
  purpose: OtpPurpose,
  sentTo: string,
  next?: string,
  channel: OtpChannel = "email"
): OtpChallenge {
  const now = Date.now()
  return {
    id: `cognito-${purpose}`,
    purpose,
    channel,
    sentTo,
    expiresAt: now + OTP_TTL_SECONDS * 1000,
    resendAvailableAt: now + RESEND_COOLDOWN_SECONDS * 1000,
    availableChannels: [channel],
    next,
  }
}

/** A missing pool is a deployment mistake, not a credentials problem — say so */
function requireCognito() {
  if (!cognitoConfigured)
    throw new AuthError(
      "Sign-in is not configured for this environment. Set VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID.",
      "NotConfigured"
    )
}

/**
 * Answer Cognito's "which factor?" step.
 *
 * The pool has both e-mail and SMS MFA enabled, so after a correct password it
 * asks the user to choose (`SELECT_MFA_TYPE`, with MFAS_CAN_CHOOSE listing
 * EMAIL_OTP and SMS_MFA). The console is built around the e-mail code, so it
 * answers on the user's behalf rather than adding a screen nobody needs.
 *
 * `availableChannels` is set from what Cognito actually offered, so the code
 * screen's "try another way" link appears only when SMS is genuinely available.
 */
async function chooseEmailFactor(
  allowed: readonly string[] | undefined,
  purpose: OtpPurpose,
  next?: string
): Promise<OtpChallenge> {
  const { nextStep } = await confirmSignIn({ challengeResponse: "EMAIL" })

  if (nextStep?.signInStep !== "CONFIRM_SIGN_IN_WITH_EMAIL_CODE")
    throw new AuthError(
      `Expected an e-mail code after choosing the factor, got ${nextStep?.signInStep}.`,
      nextStep?.signInStep ?? "unknown"
    )

  const sentTo =
    nextStep.codeDeliveryDetails?.destination ?? (flow ? maskEmail(flow.username) : "your e-mail")
  /*
   * E-mail only for now. Cognito may well offer SMS as well, but the console
   * does not use it, so the code screen must not advertise a "try another way"
   * that sends a text. Widen this to include "sms" when text delivery is wanted.
   */
  void allowed
  return { ...challengeFrom(purpose, sentTo, next), availableChannels: ["email"] }
}

/** Turn whatever Amplify threw into the typed error the screens already expect */
function asAuthError(e: unknown, fallback: string): AuthError {
  const err = e as { name?: string; message?: string }
  return new AuthError(err?.message || fallback, err?.name || "unknown")
}

/*
 * The profile no longer comes from the ID token: `app-user.loadAppUser` builds
 * it from GET /api/v1/auth/me, because the backend owns roles. Cognito is still
 * where the contact attributes live, which that module reads directly.
 */

/* ------------------------------------------------------- login & the OTP -- */

/**
 * Step 1 of login. A correct password does not create a session — Cognito
 * answers with the e-mail OTP challenge that step 2 confirms.
 */
export async function signIn(email: string, password: string, next?: string): Promise<OtpChallenge> {
  requireCognito()
  const username = email.trim().toLowerCase()
  try {
    const { nextStep } = await cognitoSignIn({ username, password })

    switch (nextStep.signInStep) {
      case "CONFIRM_SIGN_IN_WITH_EMAIL_CODE": {
        flow = { username, password }
        const sentTo = nextStep.codeDeliveryDetails?.destination ?? maskEmail(username)
        return challengeFrom("login", sentTo, next)
      }

      /* Both e-mail and SMS MFA are on the pool, so Cognito asks which to use */
      case "CONTINUE_SIGN_IN_WITH_MFA_SELECTION":
        flow = { username, password }
        return chooseEmailFactor(nextStep.allowedMFATypes, "login", next)

      /*
       * Cognito did not ask: this user already has SMS as their preferred
       * factor, so the text has been sent. There is no way to move an open
       * challenge to e-mail, so accept the code rather than dead-end the login —
       * `preferEmailMfa` then makes e-mail preferred for next time.
       */
      case "CONFIRM_SIGN_IN_WITH_SMS_CODE": {
        flow = { username, password }
        const sentTo = nextStep.codeDeliveryDetails?.destination ?? maskPhone(username)
        return challengeFrom("login", sentTo, next, "sms")
      }

      /*
       * An admin-created account still on its temporary password. Cognito will
       * not issue a session until a new one is set, so the screens need a
       * dedicated step — surfaced as an error rather than silently failing.
       */
      case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
        flow = { username, password }
        throw new AuthError(
          "This account is still on its temporary password. Set a new password to continue.",
          "NewPasswordRequired"
        )

      case "RESET_PASSWORD":
        throw new AuthError("This password must be reset before you can sign in.", "PasswordResetRequired")

      /*
       * Cognito accepted the password without asking for a code. That means MFA
       * is not being enforced for this account — either the pool has it OPTIONAL
       * and the user has not enrolled, or e-mail MFA is off.
       *
       * The console's login is two-step by design, so rather than letting
       * someone in through a half-flow, end the session and say why. Set MFA to
       * required (or enrol the user) and this branch stops being reachable.
       */
      case "DONE":
        await cognitoSignOut()
        throw new AuthError(
          "This account signed in without a verification code. Enable e-mail MFA for it before using the console.",
          "MfaNotEnforced"
        )

      default:
        throw new AuthError(
          `Unsupported sign-in step: ${nextStep.signInStep}. Check the pool's MFA configuration.`,
          nextStep.signInStep
        )
    }
  } catch (e) {
    if (e instanceof AuthError) throw e
    clearAuthFlow()
    throw asAuthError(e, "Could not sign in.")
  }
}

/**
 * Re-issue the code.
 *
 * Amplify has no resend for an MFA challenge, so this restarts the sign-in,
 * which makes Cognito send a fresh one. That is why the password is held for
 * the life of the challenge.
 */
export async function resendOtp(challenge: OtpChallenge): Promise<OtpChallenge> {
  if (!flow) throw new AuthError("That sign-in has expired. Please start again.", "FlowExpired")
  try {
    const { nextStep } = await cognitoSignIn({ username: flow.username, password: flow.password })
    const sentTo =
      nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
        ? (nextStep.codeDeliveryDetails?.destination ?? challenge.sentTo)
        : challenge.sentTo
    return challengeFrom(challenge.purpose, sentTo, challenge.next, challenge.channel)
  } catch (e) {
    throw asAuthError(e, "Could not send another code.")
  }
}

/**
 * Deliver the code by the other factor.
 *
 * Cognito's factor choice happens once per sign-in, so there is no way to move
 * an open challenge across. Like Resend, this restarts the sign-in with the held
 * credentials and answers the selection with the other factor instead.
 */
export async function switchOtpChannel(challenge: OtpChallenge, channel: OtpChannel): Promise<OtpChallenge> {
  if (!flow) throw new AuthError("That sign-in has expired. Please start again.", "FlowExpired")
  if (channel === "voice") throw new AuthError("Voice delivery is not configured.", "ChannelUnavailable")

  try {
    const { nextStep } = await cognitoSignIn({ username: flow.username, password: flow.password })

    if (nextStep.signInStep !== "CONTINUE_SIGN_IN_WITH_MFA_SELECTION")
      throw new AuthError("This account cannot change delivery method.", "ChannelUnavailable")

    const picked = channel === "sms" ? "SMS" : "EMAIL"
    const confirmed = await confirmSignIn({ challengeResponse: picked })
    const step = confirmed.nextStep

    const expected = channel === "sms" ? "CONFIRM_SIGN_IN_WITH_SMS_CODE" : "CONFIRM_SIGN_IN_WITH_EMAIL_CODE"
    if (step?.signInStep !== expected)
      throw new AuthError(`Could not send the code by ${CHANNEL_LABEL[channel]}.`, step?.signInStep ?? "unknown")

    return {
      ...challengeFrom(challenge.purpose, step.codeDeliveryDetails?.destination ?? challenge.sentTo, challenge.next, channel),
      availableChannels: challenge.availableChannels,
    }
  } catch (e) {
    if (e instanceof AuthError) throw e
    throw asAuthError(e, "Could not change the delivery method.")
  }
}

/** Verify the code. Cognito decides correct, expired, or account locked. */
export async function verifyOtp(_challenge: OtpChallenge, code: string): Promise<AuthUser> {
  try {
    // Amplify holds the open challenge; the id is not replayed back to it
    const { isSignedIn } = await confirmSignIn({ challengeResponse: code })
    if (!isSignedIn) throw new AuthError("That code was not accepted.", "NotSignedIn")

    /*
     * Roles come from the user's Cognito groups. /sync is still called so the
     * OCC database has a row for them, but it cannot fail the sign-in.
     */
    const user = await syncAppUser()
    await preferEmailMfa()
    clearAuthFlow()
    return user
  } catch (e) {
    if (e instanceof AuthError) throw e
    throw asAuthError(e, "That code is not valid.")
  }
}

/**
 * Answer a `NEW_PASSWORD_REQUIRED` challenge.
 *
 * Cognito puts admin-created accounts in FORCE_CHANGE_PASSWORD and refuses a
 * session until the temporary password is replaced. Answering it can land in two
 * places, so both are returned: either the account still owes an MFA code, or
 * it is signed in already (a pool with MFA optional).
 */
export async function completeNewPassword(
  newPassword: string,
  next?: string
): Promise<{ challenge: OtpChallenge } | { user: AuthUser }> {
  try {
    const { isSignedIn, nextStep } = await confirmSignIn({ challengeResponse: newPassword })

    // The usual path: password accepted, now prove the e-mail
    if (nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_EMAIL_CODE") {
      const sentTo =
        nextStep.codeDeliveryDetails?.destination ?? (flow ? maskEmail(flow.username) : "your e-mail")
      return { challenge: challengeFrom("login", sentTo, next) }
    }

    /* Same selection step can follow a password change */
    if (nextStep?.signInStep === "CONTINUE_SIGN_IN_WITH_MFA_SELECTION")
      return { challenge: await chooseEmailFactor(nextStep.allowedMFATypes, "login", next) }

    if (isSignedIn) {
      const user = await syncAppUser()
      clearAuthFlow()
      return { user }
    }

    throw new AuthError(
      `Unexpected step after setting the password: ${nextStep?.signInStep}.`,
      nextStep?.signInStep ?? "unknown"
    )
  } catch (e) {
    if (e instanceof AuthError) throw e
    throw asAuthError(e, "Could not set that password.")
  }
}

/** True while a sign-in is waiting for a forced password change */
export const hasPendingSignIn = () => flow !== null

/**
 * Make e-mail this user's preferred MFA factor.
 *
 * The console is built around the e-mail code. Without a preference Cognito
 * asks which factor to use on every sign-in, and if SMS is preferred it sends a
 * text instead. Setting it once, after the first successful sign-in, means
 * later logins go straight to the e-mail code with no selection step.
 *
 * Needs an authenticated session, so it can only run here — and a failure is
 * not worth failing the sign-in over.
 */
async function preferEmailMfa() {
  try {
    // DISABLED on SMS, not just NOT_PREFERRED: while the console is e-mail-only,
    // Cognito should have no text option to fall back to for this user
    await updateMFAPreference({ email: "PREFERRED", sms: "DISABLED" })
  } catch (e) {
    console.warn("[auth] could not set e-mail as the preferred MFA factor.", e)
  }
}

/** Ends the Cognito session as well as the local one */
export async function signOutCognito() {
  clearAuthFlow()
  try {
    await cognitoSignOut()
  } catch {
    // Already signed out, or offline: the local session is cleared regardless
  }
}

/**
 * The profile for a session Cognito still considers valid, or null.
 * Called on boot so a stored session cannot outlive the tokens behind it.
 */
export async function currentUser(): Promise<AuthUser | null> {
  try {
    const session = await fetchAuthSession()
    if (!session.tokens?.idToken) return null
    return await loadAppUser()
  } catch {
    // No usable Cognito session; the stored one is dropped by the caller
    return null
  }
}

/** The access token for an API call, refreshed by Amplify when it needs to be */
export async function accessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.accessToken?.toString() ?? null
  } catch {
    return null
  }
}

/* -------------------------------------------------------- password reset -- */

/**
 * Start recovery. Cognito sends the confirmation code and reports where it went.
 *
 * The username is held because `confirmResetPassword` needs it again on the
 * next screen and `ResetContext` does not carry it.
 */
export async function requestPasswordReset(identifier: string): Promise<OtpChallenge> {
  requireCognito()
  const username = identifier.trim().toLowerCase()
  try {
    const { nextStep } = await cognitoResetPassword({ username })
    resetFor = username

    const sentTo =
      nextStep.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE"
        ? (nextStep.codeDeliveryDetails?.destination ?? maskEmail(username))
        : maskEmail(username)

    return challengeFrom("password-reset", sentTo)
  } catch (e) {
    /*
     * Cognito deliberately reveals nothing about whether an account exists, and
     * neither should the screen — report the same thing either way.
     */
    const err = e as { name?: string }
    if (err?.name === "UserNotFoundException") return challengeFrom("password-reset", maskEmail(username))
    throw asAuthError(e, "Could not start the reset.")
  }
}

/**
 * Cognito verifies the code and sets the password in one call, which is why the
 * reset context carries the code the user entered on the previous screen.
 */
export async function resetPassword(context: ResetContext, password: string): Promise<void> {
  if (!resetFor) throw new AuthError("That reset has expired. Please start again.", "FlowExpired")
  try {
    await confirmResetPassword({ username: resetFor, confirmationCode: context.code, newPassword: password })
    resetFor = null
  } catch (e) {
    throw asAuthError(e, "Could not set that password.")
  }
}

/* ------------------------------------------------- access & recovery ------ */

/**
 * Registration.
 *
 * Creates the Cognito account directly: `signUp` stores the attributes and
 * sends a confirmation code to the e-mail address. Nothing is written to the
 * OCC database here — the local row is created by `/auth/sync` after the first
 * successful sign-in, which reads the attributes back off the verified token.
 *
 * `custom:user_role` must hold a role code the backend accepts (ELPREMAR,
 * OCC_TECHNICIAN, …), not a display label — see `ACCESS_ROLES`.
 */
export async function registerUser(input: {
  email: string
  password: string
  mobile: string
  role: string
  fullName: string
}): Promise<OtpChallenge> {
  requireCognito()
  const username = input.email.trim().toLowerCase()

  try {
    const { nextStep } = await signUp({
      username,
      password: input.password,
      options: {
        userAttributes: {
          email: username,
          // Cognito requires E.164; the form collects the code and digits apart
          phone_number: toE164(input.mobile),
          name: input.fullName.trim(),
          "custom:user_role": input.role,
        },
      },
    })

    if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
      const sentTo = nextStep.codeDeliveryDetails?.destination ?? maskEmail(username)
      registeringAs = username
      return challengeFrom("contact-verification", sentTo)
    }

    /* Auto-confirmed pools sign the user straight in; there is no code to enter */
    if (nextStep.signUpStep === "DONE") {
      registeringAs = username
      return challengeFrom("contact-verification", maskEmail(username))
    }

    throw new AuthError(`Unsupported sign-up step: ${nextStep.signUpStep}.`, nextStep.signUpStep)
  } catch (e) {
    if (e instanceof AuthError) throw e
    throw asAuthError(e, "Could not create that account.")
  }
}

/** The address being registered, needed again by `confirmSignUp` */
let registeringAs: string | null = null

/** Digits plus the country code, as Cognito stores phone numbers */
function toE164(mobile: string) {
  const digits = mobile.replace(/\D/g, "")
  // Assume India when the form gave ten bare digits and no country code
  return digits.length === 10 ? `+91${digits}` : `+${digits}`
}

/**
 * Confirm the e-mailed code. This activates the Cognito account; it does not
 * create the database user — the first sign-in does that through `/auth/sync`.
 */
export async function confirmRegistration(_challenge: OtpChallenge, code: string): Promise<void> {
  if (!registeringAs) throw new AuthError("That registration has expired. Please start again.", "FlowExpired")
  try {
    await confirmSignUp({ username: registeringAs, confirmationCode: code })
    registeringAs = null
  } catch (e) {
    throw asAuthError(e, "That code is not valid.")
  }
}

/**
 * Last resort when the registered mobile and e-mail are both unreachable: the
 * OCC helpdesk verifies identity out of band.
 *
 * TODO(aws): POST to the support desk API and return the real ticket number.
 */
export async function submitRecovery(_request: RecoveryRequestInput): Promise<{ reference: string }> {
  await pause()
  return { reference: `TK-${Math.floor(1000 + Math.random() * 8999)}` }
}
