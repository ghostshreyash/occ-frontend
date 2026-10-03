/**
 * Where a one-time code goes by default, per role.
 *
 * E-mail is the default for everyone: desk roles sign in from a workstation and
 * reach their inbox faster than their handset. The field-facing OCC roles are
 * the exception — they are usually on site with a phone and no mail client — so
 * their code goes by SMS instead.
 *
 * Either way the other channel stays available on the code screen, so this only
 * decides where the first code is sent, never where it can be sent.
 *
 * TODO(aws): the authoritative channel comes from the user's Cognito attributes
 * and MFA preference; this map is what the client assumes until it does.
 */
import type { OtpChannel } from "./types"

/** Roles whose first code goes to the handset rather than the inbox */
export const mobileFirstRoles = new Set(["OCC Manager", "OCC Technician", "OCC EMMSE"])

export function defaultChannelFor(role: string): OtpChannel {
  return mobileFirstRoles.has(role) ? "sms" : "email"
}

/** The other way round, for the "send it to my …" link on the code screen */
export const fallbackChannelFor = (channel: OtpChannel): OtpChannel => (channel === "email" ? "sms" : "email")
