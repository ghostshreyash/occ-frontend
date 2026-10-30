/**
 * The mock ELPREMAR registry, and the work assigned to the people in it.
 *
 * The register and the detail screen now read the API (`src/lib/api/elpremars.ts`),
 * so what is left here is what has no endpoint behind it yet: the roster the
 * dashboards count, and the maintenance, inspection and support rows matched to
 * a person by name.
 */
import { elpremarLifecycle, elpremarRoles, elpremarRoster } from "@/data/master-data"
import { format } from "date-fns"
import type { WorkStatus } from "@/lib/status"
import { allSupportTickets, enterpriseRecords, inspectionActivities, maintenanceActivities, profileFor } from "@/data/occ-tables"
import type { EnterpriseRecord } from "@/data/occ-tables"

/** Whether the account may be used */
export type ElpremarStatus = "active" | "inactive"

export type ElpremarRecord = {
  id: string
  name: string
  salutation: string
  /** One person can cover more than one stream */
  roles: string[]
  designation: string
  enterprise: string
  plant: string
  city: string
  country: string
  department: string
  experience: number
  certifications: number
  /** Earliest certification expiry, DD-MM-YYYY */
  certifiedUntil: string
  joined: string
  status: ElpremarStatus
}

export const elpremarStatusMeta: Record<ElpremarStatus, { label: string; badge: "success" | "neutral"; stripe: string; chip: string }> = {
  active: { label: "Active", badge: "success", stripe: "bg-healthy", chip: "bg-healthy-soft text-healthy-soft-foreground" },
  inactive: { label: "Inactive", badge: "neutral", stripe: "bg-neutral", chip: "bg-neutral-soft text-neutral-soft-foreground" },
}

/* ---------- Seeded helpers ---------- */

const seedOf = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const pick = <T,>(pool: readonly T[], seed: number, offset: number) => pool[(seed + offset * 7) % pool.length]

const REFERENCE = new Date(2026, 8, 28)
const dateOffset = (days: number) => {
  const d = new Date(REFERENCE)
  d.setDate(d.getDate() + days)
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
}


/** The platform's three certified ELPREMAR streams */
const CERTIFICATES = [
  { name: "EVITA Field Inspection", issuer: "Olivine Global Systems" },
  { name: "INSTA CLEAN Application", issuer: "Olivine Global Systems" },
  { name: "Fire Prevention System", issuer: "Olivine Global Systems" },
  { name: "Electrical Safety Training", issuer: "National Safety Council" },
  { name: "Thermography Level II", issuer: "Infrared Training Centre" },
  { name: "Relay Testing & Calibration", issuer: "Siemens India" },
]

/** DD-MM-YYYY -> Date, for comparing the dates we generate as strings */
const parseDmy = (d: string) => {
  const [dd, mm, yyyy] = d.split("-").map(Number)
  return new Date(yyyy, mm - 1, dd)
}

export type Certificate = {
  id: string
  name: string
  /** The number the issuing body printed on it */
  number: string
  issuer: string
  issued: string
  validTill: string
  /** How many scans are held against it */
  documents: number
}

/**
 * Certificates held by one ELPREMAR. Shared by the register (which shows the
 * earliest expiry) and the detail table, so the two can never disagree.
 */
function certsFor(id: string, count: number): Certificate[] {
  const s = seedOf(id)
  return Array.from({ length: count }, (_, i) => {
    const c = CERTIFICATES[(s + i * 5) % CERTIFICATES.length]
    return {
      id: `${id}-C${i + 1}`,
      name: c.name,
      number: `OGS-${String(10000 + ((s + i * 137) % 89999))}`,
      issuer: c.issuer,
      documents: 1 + ((s + i) % 2),
      issued: dateOffset(-(300 + ((s + i * 40) % 900))),
      // Spread crosses today: a few have lapsed, which is what the register is for
      validTill: dateOffset(-45 + ((s + i * 70) % 820)),
    }
  })
}

/**
 * Days until a DD-MM-YYYY date; negative once it has passed.
 *
 * Measured from **today**, not from the `REFERENCE` the mock certificates are
 * generated around. The expiry pill now colours real certificates read from the
 * API, and against a fixed reference date "expired 12 days ago" would be out by
 * however far that date has drifted from the present.
 */
export const daysUntil = (dmy: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDmy(dmy).getTime() - today.getTime()) / 86_400_000)
}

/**
 * Where one ELPREMAR is posted, taken from the enterprise's own plant tree so
 * the plant, department and sub-department always exist under it. Keyed by the
 * same seed everywhere, so the register row and the profile never disagree.
 */
function postingFor(e: EnterpriseRecord, s: number) {
  const plants = profileFor(e).plants
  const plant = plants[s % plants.length]
  const department = plant.departments[s % plant.departments.length]
  const subDepartment = department.subDepartments[s % department.subDepartments.length]
  return { plant, department, subDepartment }
}

/* ---------- Registry ---------- */

export const elpremarRecords: ElpremarRecord[] = elpremarRoster.map((person, i) => {
  const id = `ELP-${String(1001 + i * 7).padStart(4, "0")}`
  const s = seedOf(id)
  const enterprise = enterpriseRecords[s % enterpriseRecords.length]
  const name = person.name
  const status: ElpremarStatus = elpremarLifecycle(i)
  // A suspended account keeps its posting; it just cannot be given new work
  const unassigned = false
  const posting = postingFor(enterprise, s)
  const certs = certsFor(id, 2 + (s % 3))
  // The one that lapses first is the one that limits what they can be sent to do
  const earliest = [...certs].sort((x, y) => parseDmy(x.validTill).getTime() - parseDmy(y.validTill).getTime())[0]

  return {
    id,
    name,
    // Salutation follows the roster's gender, never the seed
    salutation: person.gender === "Female" ? (s % 7 === 0 ? "Dr." : "Ms.") : s % 9 === 0 ? "Dr." : "Mr.",
    /*
     * Most cover one stream, every third covers two. Taken by position, and the
     * second offset is chosen to land on a different index - with only three
     * streams, two offsets that agree modulo 3 would collapse back to one role.
     */
    roles: i % 3 === 0 ? [pick(elpremarRoles, s, 2), pick(elpremarRoles, s, 3)] : [pick(elpremarRoles, s, 2)],
    /*
     * By position, not by hash, so all three designations are populated -
     * roughly one supervisor and one helper to every two operators.
     */
    designation: i % 4 === 0 ? "Supervisor" : i % 4 === 2 ? "Helper" : "Operator",
    enterprise: unassigned ? "" : enterprise.name,
    plant: unassigned ? "" : posting.plant.name,
    // Where they actually work, which is the plant's city rather than the HQ's
    city: unassigned ? enterprise.city : posting.plant.city,
    country: enterprise.country,
    department: unassigned ? "" : posting.department.name,
    experience: 2 + (s % 18),
    certifications: certs.length,
    certifiedUntil: earliest.validTill,
    joined: dateOffset(-(200 + (s % 1600))),
    status,
  }
})

/* ---------- Assigned work ---------- */

/** Work rows assigned to one ELPREMAR, across all three streams */
export const workloadFor = (name: string) => ({
  maintenance: maintenanceActivities.filter((r) => r.elpremar === name),
  tasks: inspectionActivities.filter((r) => r.elpremar === name),
  tickets: allSupportTickets.filter((r) => r.elpremar === name),
})

/** Counts by status across everything assigned to one ELPREMAR */
export function workloadCounts(name: string) {
  const w = workloadFor(name)
  const all = [...w.maintenance, ...w.tasks, ...w.tickets]
  const by = (k: WorkStatus) => all.filter((r) => r.status === k).length
  const done = by("completed") + by("closed")
  return { total: all.length, open: all.length - done, done }
}

/* ---------- Upcoming work ---------- */

export type UpcomingActivity = {
  id: string
  kind: "Maintenance" | "Inspection" | "Support"
  label: string
  plant: string
  date: string
  slot?: number
  status: WorkStatus
}

/*
 * Work rows are dated relative to the real current date (occ-tables' day()),
 * not the fixed REFERENCE the certificates use - so "upcoming" has to be
 * measured from today, or the window drifts as real time passes.
 */
const daysFromToday = (dmy: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDmy(dmy).getTime() - today.getTime()) / 86_400_000)
}

/** The next few jobs on one ELPREMAR's calendar, soonest first */
export function upcomingFor(name: string, count = 3): UpcomingActivity[] {
  const w = workloadFor(name)
  // Tickets and tasks may carry no date yet, so the date is optional until filtered
  const rows: (Omit<UpcomingActivity, "date"> & { date?: string })[] = [
    ...w.maintenance.map((r) => ({ id: r.id, kind: "Maintenance" as const, label: r.asset, plant: r.plant, date: r.scheduled, slot: r.slot, status: r.status })),
    ...w.tasks.map((r) => ({ id: r.id, kind: "Inspection" as const, label: r.activity, plant: r.plant, date: r.due, slot: r.slot, status: r.status })),
    ...w.tickets.map((r) => ({ id: r.id, kind: "Support" as const, label: r.subject, plant: r.plant, date: r.scheduled, slot: r.slot, status: r.status })),
  ]

  return rows
    .filter((r): r is UpcomingActivity => Boolean(r.date) && daysFromToday(r.date!) >= 0)
    .sort((a, b) => daysFromToday(a.date) - daysFromToday(b.date) || (a.slot ?? 0) - (b.slot ?? 0))
    .slice(0, count)
}

/** "Today" / "Tomorrow" / "Fri 9 Oct" - a date you can act on, never a countdown */
export function whenLabel(dmy: string) {
  const d = daysFromToday(dmy)
  if (d === 0) return "Today"
  if (d === 1) return "Tomorrow"
  return format(parseDmy(dmy), "EEE d MMM")
}
