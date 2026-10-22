/**
 * The signed-in user, built from Cognito.
 *
 * Roles come from the **`cognito:groups` claim on the ID token** — the group a
 * user is in is what the console's navigation, ticket access and RBAC match on.
 * The backend still enforces its own authorization on every call; this only
 * decides what the UI offers.
 *
 * `POST /api/v1/auth/sync` is still called after sign-in so the OCC database has
 * a row for the user, but it is **not** on the critical path: the console reads
 * identity from the token, so a backend that is down or not yet deployed does
 * not stop anyone signing in.
 */
import { fetchAuthSession, fetchUserAttributes, getCurrentUser } from "aws-amplify/auth"

import { apiFetch } from "@/lib/api/client"
import type { AuthUser } from "./types"

/**
 * Group names may be written either way depending on how the pool was set up —
 * `OCC_TECHNICIAN` from a scripted deploy, `OCC Technician` from the console.
 * The console matches on display strings, so normalise to those.
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
 * A Cognito group name as the UI spells it. An unrecognised group passes
 * through title-cased rather than being dropped — a role the UI does not know
 * should still be visible, not silently blank.
 */
export function roleLabel(group: string): string {
  if (ROLE_LABELS[group]) return ROLE_LABELS[group]
  // Already in display form, e.g. a group literally named "OCC Admin"
  if (group.includes(" ")) return group
  return group
    .split("_")
    .map((w) => (w.length <= 4 ? w.toUpperCase() : w[0] + w.slice(1).toLowerCase()))
    .join(" ")
}

/** Groups on the ID token, in the order Cognito returned them */
function groupsFrom(payload: Record<string, unknown> | undefined): string[] {
  const groups = payload?.["cognito:groups"]
  return Array.isArray(groups) ? groups.map((g) => roleLabel(String(g))) : []
}

/** The signed-in user as the console renders them */
export async function loadAppUser(): Promise<AuthUser> {
  const [{ userId }, attrs, session] = await Promise.all([
    getCurrentUser(),
    fetchUserAttributes(),
    fetchAuthSession(),
  ])

  const name = attrs.name ?? attrs.email ?? "User"
  const roles = groupsFrom(session.tokens?.idToken?.payload)

  return {
    id: attrs["custom:employee_id"] ?? userId,
    name,
    initials: name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    // One acting role drives RBAC; the rest are kept for display
    role: roles[0] ?? "",
    roles,
    email: attrs.email ?? "",
    mobile: attrs.phone_number ?? "",
    ...(attrs.picture ? { avatar: attrs.picture } : {}),
  }
}

/**
 * Tell the backend about this user so it has a local row, then return the
 * profile.
 *
 * A failure here is logged and swallowed on purpose: the sync is bookkeeping,
 * not authentication, and blocking sign-in on it would make the console
 * unusable whenever the API is down — which includes every local run before the
 * backend is started.
 */
export async function syncAppUser(): Promise<AuthUser> {
  try {
    await apiFetch("/api/v1/auth/sync", { method: "POST" })
  } catch (e) {
    console.warn("[auth] /auth/sync failed; continuing with the Cognito profile.", e)
  }
  return loadAppUser()
}
