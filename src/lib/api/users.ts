/**
 * Provisioning a login.
 *
 *     POST /api/v1/users
 *
 * Only the enterprise onboarding uses this: creating the enterprise is one
 * call, and its administrator's login is a second one. The endpoint creates the
 * Cognito user as well as the database row, and a `temporaryPassword` is set as
 * a **permanent** password with the invitation email suppressed — which is
 * exactly what the wizard's Add Enterprise Admin card describes, a password
 * typed by the operator and handed over out of band.
 *
 * Role codes are the database's (`prisma/seeds/roles.seed.js`): upper case with
 * underscores, not the console's display labels.
 */
import { apiFetch } from "./client"
import type { Envelope } from "./types"

export type CreatedUser = { id: string; email: string; fullName: string; status: string }

export type NewUser = {
  fullName: string
  email: string
  phone?: string
  /** A role code, e.g. `ENTERPRISE_ADMIN` */
  role: string
  status?: "ACTIVE" | "INACTIVE"
  /** Set as the account's password; no invitation email is sent when given */
  temporaryPassword?: string
}

export async function createUser(user: NewUser): Promise<CreatedUser> {
  const body = await apiFetch<Envelope<CreatedUser>>("/api/v1/users", {
    method: "POST",
    body: {
      ...user,
      email: user.email.trim().toLowerCase(),
      status: user.status ?? "ACTIVE",
    },
  })
  return body.data
}

/**
 * The enterprise's administrator login, as created at the end of onboarding.
 *
 * The card collects an email and a password but no name, so the account is
 * named after the enterprise it administers — derived from what the operator
 * typed rather than invented, and readable in a user list.
 */
export const createEnterpriseAdmin = (enterpriseName: string, email: string, password: string) =>
  createUser({
    fullName: `${enterpriseName} Administrator`.slice(0, 240),
    email,
    role: "ENTERPRISE_ADMIN",
    temporaryPassword: password,
  })
