/**
 * The signed-in user, built from Cognito.
 *
 * The role comes from the **`custom:user_role` attribute** — the same attribute
 * `signUp` writes and the backend validates against its role codes. That value
 * is what the console's navigation, ticket access and RBAC match on. The
 * backend still enforces its own authorization on every call; this only decides
 * what the UI offers.
 *
 * After sign-in the console calls `POST /api/v1/auth/sync` so the OCC database
 * has a row for the user, then `GET /api/v1/auth/me` for the profile it holds.
 * The backend's answer wins where it has one, because it is the authority on
 * roles and is what authorizes every later call.
 *
 * Neither call is on the critical path. If the API is down or not yet deployed
 * the Cognito profile stands on its own, so local work and a backend outage
 * still let people sign in.
 */
import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth"

import { ApiError, apiFetch } from "@/lib/api/client"
import type { AuthUser } from "./types"

/**
 * Role codes may be written either way depending on how the account was made —
 * `OCC_TECHNICIAN` from sign-up or a scripted deploy, `OCC Technician` if
 * someone typed the label into the console. The UI matches on display strings,
 * so normalise to those.
 *
 * Listed explicitly rather than derived, because the acronyms do not survive a
 * generic title-case: ELPREMAR, EMMSE and OCC must stay upper, and "EMMSE-0"
 * keeps its hyphen.
 */
const ROLE_LABELS: Record<string, string> = {
  OCC_ADMIN: "OCC Admin",
  OCC_MANAGER: "OCC Manager",
  OCC_TECHNICIAN: "OCC Technician",
  OCC_EMMSE: "OCC EMMSE",
  EMMSE_0: "EMMSE-0",
  ELPREMAR: "ELPREMAR",
  ENTERPRISE_ADMIN: "Enterprise Admin",
  ENTERPRISE_MANAGER: "Enterprise Manager",
  PLANT_ADMIN: "Plant Admin",
  PLANT_MANAGER: "Plant Manager",
  SYSTEM_ADMIN: "System Admin",
  OLIVINE_ADMIN: "OLIVINE Admin",
}

/**
 * A role code as the UI spells it. An unrecognised code passes through
 * title-cased rather than being dropped — a role the UI does not know should
 * still be visible, not silently blank.
 */
export function roleLabel(code: string): string {
  if (ROLE_LABELS[code]) return ROLE_LABELS[code]
  // Already in display form, e.g. an attribute literally set to "OCC Admin"
  if (code.includes(" ")) return code
  return code
    .split("_")
    .map((w) => (w.length <= 4 ? w.toUpperCase() : w[0] + w.slice(1).toLowerCase()))
    .join(" ")
}

/**
 * The roles on `custom:user_role`, as display labels.
 *
 * The attribute normally holds one code. A comma-separated list is tolerated
 * because nothing in Cognito stops an administrator writing one, and dropping
 * the extras would silently narrow someone's access.
 */
function rolesFrom(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean)
    .map(roleLabel)
}

/** Up to two letters for the avatar fallback */
function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/** The signed-in user as the console renders them */
export async function loadAppUser(): Promise<AuthUser> {
  const [{ userId }, attrs, session] = await Promise.all([
    getCurrentUser(),
    fetchUserAttributes(),
    fetchAuthSession(),
  ])

  const name = attrs.name ?? attrs.email ?? "User"

  /*
   * GetUser is authoritative, but the attribute is only returned when the app
   * client has read access to it — fall back to the ID token claim, which
   * carries the same value, so a missing client permission does not present a
   * signed-in user with no role at all.
   */
  const claim = session.tokens?.idToken?.payload?.["custom:user_role"]
  const roles = rolesFrom(
    attrs["custom:user_role"] ?? (typeof claim === "string" ? claim : undefined),
  )

  return {
    id: attrs["custom:employee_id"] ?? userId,
    name,
    initials: initialsFor(name),
    // One acting role drives RBAC; the rest are kept for display
    role: roles[0] ?? "",
    roles,
    email: attrs.email ?? "",
    mobile: attrs.phone_number ?? "",
    ...(attrs.picture ? { avatar: attrs.picture } : {}),
  }
}

/**
 * What `GET /api/v1/auth/me` may return.
 *
 * Spelt loosely on purpose: the console should not break because the backend
 * calls a field `fullName` instead of `name`, and every field is optional so a
 * partial answer still merges cleanly over the Cognito profile.
 */
type MeResponse = {
  id?: string | number
  name?: string
  fullName?: string
  email?: string
  phone?: string
  phoneNumber?: string
  mobile?: string
  role?: string
  roles?: string[]
  avatar?: string
  picture?: string
  /** Some APIs nest the person under `user` and keep roles at the top level */
  user?: Omit<MeResponse, "user">
}

/**
 * The backend's view of this user, or null when it has nothing to say.
 *
 * Partial by design: only the fields it actually answered are returned, so
 * merging leaves the Cognito value in place for everything else rather than
 * blanking a name the backend happens not to store.
 */
async function fetchMe(): Promise<Partial<AuthUser> | null> {
  let body: MeResponse
  try {
    body = await apiFetch<MeResponse>("/api/v1/auth/me")
  } catch (e) {
    /*
     * 404 while the route does not exist, 0 while the API is unreachable, 401
     * when the backend does not accept this token. None of them should stop a
     * sign-in Cognito has already granted.
     */
    const status = e instanceof ApiError ? e.status : undefined
    console.warn(`[auth] /auth/me unavailable (status ${status ?? "?"}); using the Cognito profile.`, e)
    return null
  }

  const me = { ...body, ...(body.user ?? {}) }
  const name = me.name ?? me.fullName
  const roles = (me.roles ?? (me.role ? [me.role] : [])).map(roleLabel)
  const avatar = me.avatar ?? me.picture

  const mobile = me.phone ?? me.phoneNumber ?? me.mobile

  return {
    ...(me.id !== undefined ? { id: String(me.id) } : {}),
    ...(name ? { name, initials: initialsFor(name) } : {}),
    ...(me.email ? { email: me.email } : {}),
    ...(mobile ? { mobile } : {}),
    ...(roles.length ? { role: roles[0], roles } : {}),
    ...(avatar ? { avatar } : {}),
  }
}

/**
 * The profile the console shows: Cognito, with the backend's answer laid over it.
 *
 * Used on every boot as well as at sign-in, so a reload shows the same name and
 * role the sign-in did. Reading it from one place is the point — building it two
 * ways meant a profile that changed when the page was refreshed.
 */
export async function resolveAppUser(): Promise<AuthUser> {
  const [cognitoUser, me] = await Promise.all([loadAppUser(), fetchMe()])
  return me ? { ...cognitoUser, ...me } : cognitoUser
}

/**
 * Register the user with the backend, then build the profile the console shows.
 *
 * `/auth/sync` creates the local row and must happen before `/auth/me`, which
 * would otherwise be asked about a user the backend has never seen. Both are
 * best-effort: the sync is bookkeeping and the profile has a working fallback,
 * so neither failing is worth refusing a session Cognito has already issued.
 */
export async function syncAppUser(): Promise<AuthUser> {
  try {
    await apiFetch("/api/v1/auth/sync", { method: "POST" })
  } catch (e) {
    console.warn("[auth] /auth/sync failed; continuing with the Cognito profile.", e)
  }
  return resolveAppUser()
}
