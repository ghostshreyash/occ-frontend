/**
 * Console logins the OCC Admin has provisioned.
 *
 * Only the four OCC-side roles live here. Enterprise, plant and ELPREMAR
 * accounts are created elsewhere in their own flows, so they are deliberately
 * not in this register — `userRoles` in master-data is the full platform list.
 *
 * Replace with GET /console-users later. The store below is the same
 * useSyncExternalStore pattern the maintenance and ticket books use, so a user
 * added in the dialog shows up in the table without a reload.
 */
import { useSyncExternalStore } from "react"

/** The roles an OCC Admin can issue from Manage Users */
export const consoleUserRoles = ["OCC Admin", "OCC Manager", "OCC Technician", "EMMSE-0"] as const
export type ConsoleUserRole = (typeof consoleUserRoles)[number]

/**
 * Whether the login may be used. Purely administrative — the same Active /
 * Inactive pair the ELPREMAR register uses, and deliberately not health
 * wording: an inactive account is not an unhealthy one, it is switched off.
 */
export const consoleUserStatuses = ["Active", "Inactive"] as const
export type ConsoleUserStatus = (typeof consoleUserStatuses)[number]

/** Green for Active, neutral for Inactive — matching `elpremarStatusMeta` */
export const consoleUserStatusTone: Record<ConsoleUserStatus, string> = {
  Active: "bg-healthy-soft text-healthy-soft-foreground",
  Inactive: "bg-neutral-soft text-neutral-soft-foreground",
}

export type ConsoleUser = {
  id: string
  name: string
  role: ConsoleUserRole
  email: string
  /** Stored with its dialling code, as everywhere else in the console */
  phone: string
  country: string
  address: string
  status: ConsoleUserStatus
  /**
   * The temporary password the admin issued, kept so Manage Users can show it
   * back to them.
   *
   * DEMO ONLY. A real backend stores a hash and physically cannot return this —
   * when the API lands, drop this field and the reveal control with it rather
   * than having the server send a password down the wire. Absent once the user
   * has set their own, which is the state the API would always be in.
   */
  tempPassword?: string
  /**
   * Set on a freshly provisioned login: the admin's temporary password is still
   * in force, so the sign-in flow makes the user choose their own before letting
   * them through. Cleared once they have.
   *
   * The password itself is never held here — it goes to the API and nowhere else.
   */
  mustChangePassword?: boolean
  /** Who provisioned the login, so the register says where each came from */
  addedBy: string
  /** dd-MM-yyyy */
  addedOn: string
}

const seed: ConsoleUser[] = [
  { id: "USR-0001", name: "Arun Prakash", role: "OCC Admin", email: "arun.prakash@olivineglobal.com", phone: "+91 9820011223", country: "India", address: "Olivine Command Centre, Andheri East, Mumbai 400093", tempPassword: "Olivine@202501", status: "Active", addedBy: "OCC Admin", addedOn: "12-01-2025" },
  { id: "USR-0002", name: "Ravi Menon", role: "OCC Manager", email: "ravi.menon@olivineglobal.com", phone: "+91 9833044556", country: "India", address: "Olivine Command Centre, Andheri East, Mumbai 400093", tempPassword: "Olivine@202502", status: "Active", addedBy: "Arun Prakash", addedOn: "03-02-2025" },
  { id: "USR-0003", name: "Neha Joshi", role: "OCC Technician", email: "neha.joshi@olivineglobal.com", phone: "+91 9811022334", country: "India", address: "Tower B, Cyber City, Gurugram 122002", tempPassword: "Olivine@202503", status: "Active", addedBy: "Arun Prakash", addedOn: "17-02-2025" },
  { id: "USR-0004", name: "Divya Iyer", role: "OCC Manager", email: "divya.iyer@olivineglobal.com", phone: "+91 9845566778", country: "India", address: "Prestige Tech Park, Marathahalli, Bengaluru 560103", tempPassword: "Olivine@202504", status: "Active", addedBy: "Arun Prakash", addedOn: "06-03-2025" },
  { id: "USR-0005", name: "Imran Qureshi", role: "EMMSE-0", email: "imran.qureshi@olivineglobal.com", phone: "+971 501234567", country: "United Arab Emirates", address: "Jebel Ali Free Zone, Office 214, Dubai", tempPassword: "Olivine@202505", status: "Active", addedBy: "Arun Prakash", addedOn: "21-03-2025" },
  { id: "USR-0006", name: "Sneha Gupta", role: "OCC Technician", email: "sneha.gupta@olivineglobal.com", phone: "+91 9867788990", country: "India", address: "Hiranandani Business Park, Powai, Mumbai 400076", tempPassword: "Olivine@202506", status: "Active", addedBy: "Ravi Menon", addedOn: "09-04-2025" },
  { id: "USR-0007", name: "Hans Richter", role: "OCC Manager", email: "hans.richter@olivineglobal.com", phone: "+49 15112345678", country: "Germany", address: "Mainzer Landstrasse 41, 60329 Frankfurt am Main", tempPassword: "Olivine@202507", status: "Active", addedBy: "Arun Prakash", addedOn: "28-04-2025" },
  { id: "USR-0008", name: "Grace Tan", role: "OCC Technician", email: "grace.tan@olivineglobal.com", phone: "+65 81234567", country: "Singapore", address: "8 Marina Boulevard, Level 11, Singapore 018981", tempPassword: "Olivine@202508", status: "Inactive", addedBy: "Ravi Menon", addedOn: "14-05-2025" },
  { id: "USR-0009", name: "Fatima Al Nuaimi", role: "EMMSE-0", email: "fatima.alnuaimi@olivineglobal.com", phone: "+971 502345678", country: "United Arab Emirates", address: "Al Reem Island, Sky Tower, Abu Dhabi", tempPassword: "Olivine@202509", status: "Active", addedBy: "Arun Prakash", addedOn: "02-06-2025" },
  { id: "USR-0010", name: "Diego Alvarez", role: "OCC Technician", email: "diego.alvarez@olivineglobal.com", phone: "+1 7135550142", country: "United States", address: "1200 Smith Street, Suite 900, Houston, TX 77002", tempPassword: "Olivine@202510", status: "Active", addedBy: "Ravi Menon", addedOn: "19-06-2025" },
  { id: "USR-0011", name: "Meena Krishnan", role: "OCC Manager", email: "meena.krishnan@olivineglobal.com", phone: "+91 9822033445", country: "India", address: "Magarpatta City, Hadapsar, Pune 411028", tempPassword: "Olivine@202511", status: "Active", addedBy: "Arun Prakash", addedOn: "07-07-2025" },
  { id: "USR-0012", name: "Rajesh Iyer", role: "OCC Technician", email: "rajesh.iyer@olivineglobal.com", phone: "+91 9830055667", country: "India", address: "Salt Lake Sector V, Kolkata 700091", tempPassword: "Olivine@202512", status: "Inactive", addedBy: "Ravi Menon", addedOn: "23-07-2025" },
]

/* ---------- Store ---------- */

let rows: ConsoleUser[] = seed
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The register, live — re-renders every table showing it when a user is added */
export function useConsoleUsers() {
  return useSyncExternalStore(subscribe, () => rows, () => rows)
}

export type NewConsoleUser = Omit<ConsoleUser, "id" | "addedBy" | "addedOn">

/** Ids count up from the highest already issued, so they stay unique and readable */
export function addConsoleUser(input: NewConsoleUser, addedBy: string): ConsoleUser {
  const highest = rows.reduce((max, r) => Math.max(max, Number(r.id.replace("USR-", "")) || 0), 0)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")

  const user: ConsoleUser = {
    ...input,
    id: `USR-${String(highest + 1).padStart(4, "0")}`,
    addedBy,
    addedOn: `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`,
  }

  rows = [user, ...rows]
  emit()
  return user
}

/**
 * True when the address is already on the register — a login is one per e-mail.
 * `exceptId` is the row being edited, which must not collide with itself.
 */
export const emailTaken = (email: string, exceptId?: string) =>
  rows.some((r) => r.id !== exceptId && r.email.toLowerCase() === email.trim().toLowerCase())

/** One user by id, for the details screen */
export const findConsoleUser = (id?: string) => (id ? rows.find((r) => r.id === id) : undefined)

/** What the details screen may change. Id and the provisioning trail are fixed. */
export type EditableConsoleUser = Omit<ConsoleUser, "id" | "addedBy" | "addedOn" | "mustChangePassword" | "tempPassword">

/**
 * An admin has issued a new temporary password. The password itself goes to the
 * API and is never held here — all that changes locally is the flag that makes
 * the user choose their own the next time they sign in.
 */
export function resetConsoleUserPassword(id: string, tempPassword: string) {
  rows = rows.map((r) => (r.id === id ? { ...r, tempPassword, mustChangePassword: true } : r))
  emit()
}

export function updateConsoleUser(id: string, patch: Partial<EditableConsoleUser>) {
  rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
  emit()
  return findConsoleUser(id)
}
