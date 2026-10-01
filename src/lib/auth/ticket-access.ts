/**
 * Who may do what to a support ticket.
 *
 * The console carries a role on the signed-in user (`AuthUser.role`) and a list
 * of the roles the platform issues (`userRoles` in master-data), but nothing has
 * enforced them before now. This module turns that role into the handful of
 * decisions the ticket screens actually need, in one place, so the rules are
 * visible and move together. Swap the body of `capabilitiesFor` for the
 * permission set the API returns once tickets come from the backend.
 */
import type { AuthUser } from "@/lib/auth/types"
import type { TicketRow } from "@/data/occ-tables"

export type TicketCapabilities = {
  /** See every enterprise's tickets, rather than only the viewer's own */
  viewAll: boolean
  raise: boolean
  changeStatus: boolean
  close: boolean
  comment: boolean
}

/**
 * The OCC desk and platform roles — these see and run the whole queue.
 * Assignment is out of scope for Phase 1, so there is no assign capability.
 */
const deskRoles = new Set(["OLIVINE Admin", "OCC Admin", "OCC Support", "System Admin"])

/** Closure is a step beyond working a ticket, so support staff stop short of it */
const closerRoles = new Set(["OLIVINE Admin", "OCC Admin", "System Admin"])

export function capabilitiesFor(user: AuthUser | null): TicketCapabilities {
  const role = user?.role ?? ""
  const desk = deskRoles.has(role)

  return {
    viewAll: desk,
    // Anyone signed in can report a problem, including enterprise and plant users
    raise: !!user,
    changeStatus: desk,
    close: closerRoles.has(role),
    comment: !!user,
  }
}

/**
 * Tickets the viewer is allowed to see. Desk roles see everything; everyone else
 * sees only what they raised themselves.
 *
 * `user.enterprise` does not exist on the demo profile, so non-desk roles fall
 * back to matching on name — replace this with the enterprise claim from the ID
 * token once the backend issues one.
 */
export function visibleTickets(rows: TicketRow[], user: AuthUser | null): TicketRow[] {
  const caps = capabilitiesFor(user)
  if (caps.viewAll) return rows
  if (!user) return []
  return rows.filter((t) => t.raisedBy === user.name)
}

/** A ticket already closed is read-only, whatever the viewer's role */
export const isTerminal = (t: TicketRow) => t.status === "closed"
