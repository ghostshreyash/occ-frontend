/**
 * Auth integration points for the OCC console.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ The OTP itself is NOT implemented here. Codes are issued, delivered and   │
 * │ verified by AWS (Cognito user pools, SNS for SMS, SES for e-mail). Every  │
 * │ function below is a placeholder that lets the screens navigate during the │
 * │ demo; replace each body with the AWS call marked `TODO(aws)`.             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Nothing in this file validates a code, counts attempts or locks an account —
 * those are server-side policies configured in Cognito.
 */
import { type AccessRequestInput, type RecoveryRequestInput } from "./requests"
import type { AuthUser, OtpChallenge, OtpChannel, OtpPurpose, ResetContext } from "./types"

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

/* ------------------------------------------------------------ demo data --- */

/** Stand-in for the profile Cognito returns in the ID token. */
export const demoUser: AuthUser = {
  id: "OCC-ADM-001",
  name: "Admin",
  initials: "A",
  role: "OLIVINE Admin",
  email: "admin@olivineglobal.com",
  mobile: "+919876543210",
}

const pause = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms))

function placeholderChallenge(
  purpose: OtpPurpose,
  channel: OtpChannel,
  sentTo: string,
  next?: string
): OtpChallenge {
  const now = Date.now()
  return {
    id: `chl_${Math.random().toString(36).slice(2, 10)}`,
    purpose,
    channel,
    sentTo,
    expiresAt: now + OTP_TTL_SECONDS * 1000,
    resendAvailableAt: now + RESEND_COOLDOWN_SECONDS * 1000,
    availableChannels: ["sms", "voice", "email"],
    next,
  }
}

/* ------------------------------------------------------- login & the OTP -- */

/**
 * Step 1 of login. A correct password does not create a session — it returns the
 * OTP challenge that step 2 verifies.
 *
 * TODO(aws): CognitoIdentityProvider.initiateAuth (USER_PASSWORD_AUTH) and return
 * the SMS_MFA / CUSTOM_CHALLENGE session as the challenge id.
 */
export async function signIn(_email: string, _password: string, next?: string): Promise<OtpChallenge> {
  await pause()
  return placeholderChallenge("login", "sms", maskPhone(demoUser.mobile), next)
}

/**
 * TODO(aws): re-issue the code on the same channel (initiateAuth again, or a
 * custom-auth Lambda that re-sends through SNS/SES).
 */
export async function resendOtp(challenge: OtpChallenge): Promise<OtpChallenge> {
  await pause(400)
  const now = Date.now()
  return {
    ...challenge,
    expiresAt: now + OTP_TTL_SECONDS * 1000,
    resendAvailableAt: now + RESEND_COOLDOWN_SECONDS * 1000,
  }
}

/**
 * Fallback delivery: send the same challenge somewhere else when the SMS does
 * not arrive.
 *
 * TODO(aws): custom-auth Lambda picks the channel (SNS for sms/voice, SES for
 * e-mail) and returns the masked destination.
 */
export async function switchOtpChannel(challenge: OtpChallenge, channel: OtpChannel): Promise<OtpChallenge> {
  await pause(400)
  const now = Date.now()
  return {
    ...challenge,
    channel,
    sentTo: channel === "email" ? maskEmail(demoUser.email) : maskPhone(demoUser.mobile),
    expiresAt: now + OTP_TTL_SECONDS * 1000,
    resendAvailableAt: now + RESEND_COOLDOWN_SECONDS * 1000,
  }
}

/**
 * Verify a code. AWS decides whether it is correct, expired, or whether the
 * account is now locked; this placeholder always succeeds so the demo can walk
 * the flow.
 *
 * TODO(aws): respondToAuthChallenge({ ChallengeName, Session, ChallengeResponses })
 * and reject with the Cognito error so the screen can show it.
 */
export async function verifyOtp(_challenge: OtpChallenge, _code: string): Promise<AuthUser> {
  await pause()
  return demoUser
}

/* -------------------------------------------------------- password reset -- */

/**
 * Start recovery from an e-mail address or mobile number.
 *
 * TODO(aws): forgotPassword — Cognito sends the confirmation code and returns
 * the masked destination in CodeDeliveryDetails.
 */
export async function requestPasswordReset(identifier: string): Promise<OtpChallenge> {
  await pause()
  const email = identifier.includes("@")
  return placeholderChallenge("password-reset", email ? "email" : "sms", email ? maskEmail(identifier) : maskPhone(identifier))
}

/**
 * TODO(aws): confirmForgotPassword({ Username, ConfirmationCode, Password }).
 * Cognito verifies the code and sets the password in one call, which is why the
 * reset context carries the code the user entered on the previous screen.
 */
export async function resetPassword(_context: ResetContext, _password: string): Promise<void> {
  await pause()
}

/* ------------------------------------------------- access & recovery ------ */

/**
 * "Register now": OCC accounts are approved by an OLIVINE administrator, so this
 * raises a request rather than creating an account. The applicant's mobile is
 * verified by OTP first.
 *
 * TODO(aws): POST the request to the OCC API, which verifies the contact through
 * SNS and queues it for approval.
 */
export async function startAccessRequest(request: AccessRequestInput): Promise<OtpChallenge> {
  await pause()
  return placeholderChallenge("contact-verification", "sms", maskPhone(request.mobile))
}

/** TODO(aws): confirm the contact code and queue the access request. */
export async function completeAccessRequest(_challenge: OtpChallenge, _code: string): Promise<{ reference: string }> {
  await pause()
  return { reference: `REQ-${Math.floor(100000 + Math.random() * 899999)}` }
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
