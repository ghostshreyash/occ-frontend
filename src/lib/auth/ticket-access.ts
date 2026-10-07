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
 * Platform roles that run the whole queue alongside the OCC.
 *
 * Every OCC role is a desk role — see `isDesk`. The support desk is the one area
 * all three OCC logins share in full: Admin, Manager and Technician each see and
 * work every ticket, whatever their rights elsewhere in the console.
 *
 * Matching on the "OCC " prefix rather than listing the roles is deliberate: a
 * role left out of a list does not get an access error, it silently falls to the
 * "only what I raised" branch below, which for OCC staff is an empty queue.
 *
 * Assignment is out of scope for Phase 1, so there is no assign capability.
 */
const platformRoles = new Set(["OLIVINE Admin", "System Admin"])

const isDesk = (role: string) => role.startsWith("OCC ") || platformRoles.has(role)

/** Closure is a step beyond working a ticket; the OCC desk and platform roles have it */
const closerRoles = new Set(["OCC Admin", "OCC Manager", "OCC Technician", "OLIVINE Admin", "System Admin"])

export function capabilitiesFor(user: AuthUser | null): TicketCapabilities {
  const role = user?.role ?? ""
  const desk = isDesk(role)

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
