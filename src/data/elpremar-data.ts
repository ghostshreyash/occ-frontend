/**
 * ELPREMAR workforce registry and per-person profiles.
 *
 * Mirrors the shape of the enterprise register: a flat list for the table, plus
 * a deterministic full profile for the detail screen. Replace with API calls
 * (TanStack Query) later.
 */
import { dialCodeFor, elpremarLifecycle, elpremarRoles, elpremarRoster } from "@/data/master-data"
import { elpremarSkills } from "@/data/mock"
import type { WorkStatus } from "@/lib/status"
import { enterpriseRecords, inspectionActivities, maintenanceActivities, profileFor, ticketActivities } from "@/data/occ-tables"
import type { EnterpriseRecord } from "@/data/occ-tables"

/** Where they sit in the training-to-deployment lifecycle */
export type ElpremarStatus = "trained" | "not_trained" | "in_field"

export type ElpremarRecord = {
  id: string
  name: string
  salutation: string
  role: string
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

export const elpremarStatusMeta: Record<ElpremarStatus, { label: string; badge: "success" | "warning" | "info"; stripe: string; chip: string }> = {
  trained: { label: "Trained", badge: "info", stripe: "bg-info", chip: "bg-info-soft text-info-soft-foreground" },
  not_trained: { label: "Not Trained", badge: "warning", stripe: "bg-attention", chip: "bg-attention-soft text-attention-soft-foreground" },
  in_field: { label: "In Field", badge: "success", stripe: "bg-healthy", chip: "bg-healthy-soft text-healthy-soft-foreground" },
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

export type Certificate = { id: string; name: string; issuer: string; issued: string; validTill: string }

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
      issuer: c.issuer,
      issued: dateOffset(-(300 + ((s + i * 40) % 900))),
      // Spread crosses today: a few have lapsed, which is what the register is for
      validTill: dateOffset(-45 + ((s + i * 70) % 820)),
    }
  })
}

/** Days until a DD-MM-YYYY date; negative once it has passed */
export const daysUntil = (dmy: string) => Math.round((parseDmy(dmy).getTime() - REFERENCE.getTime()) / 86_400_000)

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
  // A tenth of the workforce sits unassigned, a fifth is on leave
  const status: ElpremarStatus = elpremarLifecycle(i)
  // Nobody is posted to a plant before they have been trained
  const unassigned = status === "not_trained"
  const posting = postingFor(enterprise, s)
  const certs = certsFor(id, 2 + (s % 3))
  // The one that lapses first is the one that limits what they can be sent to do
  const earliest = [...certs].sort((x, y) => parseDmy(x.validTill).getTime() - parseDmy(y.validTill).getTime())[0]

  return {
    id,
    name,
    // Salutation follows the roster's gender, never the seed
    salutation: person.gender === "Female" ? (s % 7 === 0 ? "Dr." : "Ms.") : s % 9 === 0 ? "Dr." : "Mr.",
    role: pick(elpremarRoles, s, 2),
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

/**
 * The next free employee ID. Onboarding fills this in rather than asking for
 * it, so two people can never be handed the same one.
 */
export const nextElpremarId = () => {
  const highest = elpremarRecords.reduce((n, e) => Math.max(n, Number(e.id.replace(/\D/g, "")) || 0), 1000)
  return `ELP-${highest + 1}`
}

export const elpremarRegisterKpis = {
  total: elpremarRecords.length,
  trained: elpremarRecords.filter((e) => e.status === "trained").length,
  notTrained: elpremarRecords.filter((e) => e.status === "not_trained").length,
  inField: elpremarRecords.filter((e) => e.status === "in_field").length,
  /** Absolute month-over-month movement; these are counts in the tens */
  delta: { total: 2, inField: 3 },
}

/* ---------- Full profile ---------- */

export type ElpremarProfile = {
  basic: {
    name: string
    salutation: string
    employeeId: string
    dob: string
    gender: string
    postalCode: string
    phoneCode: string
    phone: string
    email: string
    address: string
  }
  posting: {
    enterprise: string
    plant: string
    city: string
    country: string
    department: string
    subDepartment: string
    supervisor: string
    effectiveFrom: string
  }
  work: {
    role: string
    experience: string
    skills: string[]
  }
  certifications: Certificate[]
  account: { email: string; role: string; webAccess: boolean; mobileAccess: boolean; lastLogin: string }
}

/** Build the full profile for one ELPREMAR, deterministically */
export function elpremarProfileFor(e: ElpremarRecord): ElpremarProfile {
  const s = seedOf(e.id)
  const home = enterpriseRecords.find((x) => x.name === e.enterprise)
  const assigned = home ? postingFor(home, s) : undefined
  const slug = e.name.toLowerCase().replace(/[^a-z]/g, ".")
  const dob = new Date(1975 + (s % 25), s % 12, 1 + (s % 27))

  return {
    basic: {
      name: e.name,
      salutation: e.salutation,
      employeeId: e.id,
      dob: `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`,
      gender: elpremarRoster.find((r) => r.name === e.name)?.gender ?? "Male",
      // Six digits in India, five elsewhere - enough to look right per country
      postalCode: e.country === "India" ? String(110000 + (s % 789999)) : String(10000 + (s % 89999)),
      phoneCode: dialCodeFor(e.country),
      phone: String(9000000000 + (s % 899999999)).slice(0, 10),
      email: `${slug}@olivineglobalsystems.com`,
      address: `${e.city}, ${e.country}`,
    },
    posting: {
      enterprise: e.enterprise,
      plant: e.plant,
      city: e.city,
      country: e.country,
      department: e.department,
      subDepartment: assigned ? assigned.subDepartment.name : "",
      // The real reporting line: the head of the department they sit in
      supervisor: assigned ? `${assigned.department.salutation} ${assigned.department.head}` : "",
      effectiveFrom: dateOffset(-(30 + (s % 400))),
    },
    work: {
      role: e.role,
      experience: String(e.experience),
      // Three skills, always distinct
      skills: [0, 1, 2].map((n) => elpremarSkills[(s + n * 3) % elpremarSkills.length]).filter((v, n, a) => a.indexOf(v) === n),
    },
    certifications: certsFor(e.id, e.certifications),
    account: {
      email: `${slug}@olivineglobalsystems.com`,
      role: "ELPREMAR",
      webAccess: s % 3 !== 0,
      mobileAccess: true,
      lastLogin: dateOffset(-(s % 6)),
    },
  }
}

/* ---------- Assigned work ---------- */

/** Work rows assigned to one ELPREMAR, across all three streams */
export const workloadFor = (name: string) => ({
  maintenance: maintenanceActivities.filter((r) => r.elpremar === name),
  tasks: inspectionActivities.filter((r) => r.elpremar === name),
  tickets: ticketActivities.filter((r) => r.elpremar === name),
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

/** "Today" / "Tomorrow" / "in 4 days", for a DD-MM-YYYY date */
export function whenLabel(dmy: string) {
  const d = daysFromToday(dmy)
  return d === 0 ? "Today" : d === 1 ? "Tomorrow" : `in ${d} days`
}
