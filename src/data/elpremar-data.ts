/**
 * ELPREMAR workforce registry and per-person profiles.
 *
 * Mirrors the shape of the enterprise register: a flat list for the table, plus
 * a deterministic full profile for the detail screen. Replace with API calls
 * (TanStack Query) later.
 */
import { dialCodeFor, elpremarRoles, elpremarRoster } from "@/data/master-data"
import { elpremarSkills, shiftOptions, supervisors } from "@/data/mock"
import type { WorkStatus } from "@/lib/status"
import { enterpriseRecords, inspectionActivities, maintenanceActivities, ticketActivities } from "@/data/occ-tables"

/** On duty, on leave, or not yet assigned to any enterprise */
export type ElpremarStatus = "on_duty" | "on_leave" | "not_assigned"

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

export const elpremarStatusMeta: Record<ElpremarStatus, { label: string; badge: "success" | "warning" | "neutral"; stripe: string; chip: string }> = {
  on_duty: { label: "On Duty", badge: "success", stripe: "bg-healthy", chip: "bg-healthy-soft text-healthy-soft-foreground" },
  on_leave: { label: "On Leave", badge: "warning", stripe: "bg-attention", chip: "bg-attention-soft text-attention-soft-foreground" },
  not_assigned: { label: "Not Assigned", badge: "neutral", stripe: "bg-neutral", chip: "bg-neutral-soft text-neutral-soft-foreground" },
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

const DEPTS = ["Electrical", "Maintenance", "Operations", "Engineering", "Utilities"]

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
 * Certificate readiness. An ELPREMAR can only be dispatched on a stream whose
 * certificate is still valid, so the split matters more than the raw count.
 * 90 days is the platform's renewal warning window.
 */
export function certificationHealth(certs: Certificate[]) {
  let valid = 0
  let expiring = 0
  let expired = 0
  for (const c of certs) {
    const d = daysUntil(c.validTill)
    if (d < 0) expired++
    else if (d <= 90) expiring++
    else valid++
  }
  return { valid, expiring, expired }
}

/* ---------- Registry ---------- */

export const elpremarRecords: ElpremarRecord[] = elpremarRoster.map((person, i) => {
  const id = `ELP-${String(1001 + i * 7).padStart(4, "0")}`
  const s = seedOf(id)
  const enterprise = enterpriseRecords[s % enterpriseRecords.length]
  const name = person.name
  // A tenth of the workforce sits unassigned, a fifth is on leave
  const status: ElpremarStatus = s % 10 === 0 ? "not_assigned" : s % 5 === 0 ? "on_leave" : "on_duty"
  const unassigned = status === "not_assigned"
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
    plant: unassigned ? "" : `${enterprise.city} ${pick(["Main Plant", "Unit 2", "Substation", "Utility Block"], s, 4)}`,
    city: enterprise.city,
    country: enterprise.country,
    department: pick(DEPTS, s, 5),
    experience: 2 + (s % 18),
    certifications: certs.length,
    certifiedUntil: earliest.validTill,
    joined: dateOffset(-(200 + (s % 1600))),
    status,
  }
})

export const elpremarRegisterKpis = {
  total: elpremarRecords.length,
  onDuty: elpremarRecords.filter((e) => e.status === "on_duty").length,
  onLeave: elpremarRecords.filter((e) => e.status === "on_leave").length,
  notAssigned: elpremarRecords.filter((e) => e.status === "not_assigned").length,
  /** Absolute month-over-month movement; these are counts in the tens */
  delta: { total: 2, onDuty: 3 },
}

/* ---------- Full profile ---------- */

export type ElpremarProfile = {
  basic: {
    name: string
    salutation: string
    employeeId: string
    dob: string
    gender: string
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
    supervisor: string
  }
  work: {
    role: string
    experience: string
    shift: string
    skills: string[]
  }
  certifications: Certificate[]
  account: { email: string; role: string; webAccess: boolean; mobileAccess: boolean; lastLogin: string }
}

/** Build the full profile for one ELPREMAR, deterministically */
export function elpremarProfileFor(e: ElpremarRecord): ElpremarProfile {
  const s = seedOf(e.id)
  const slug = e.name.toLowerCase().replace(/[^a-z]/g, ".")
  const dob = new Date(1975 + (s % 25), s % 12, 1 + (s % 27))

  return {
    basic: {
      name: e.name,
      salutation: e.salutation,
      employeeId: e.id,
      dob: `${dob.getFullYear()}-${String(dob.getMonth() + 1).padStart(2, "0")}-${String(dob.getDate()).padStart(2, "0")}`,
      gender: elpremarRoster.find((r) => r.name === e.name)?.gender ?? "Male",
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
      supervisor: pick(supervisors, s, 8),
    },
    work: {
      role: e.role,
      experience: String(e.experience),
      shift: pick(shiftOptions, s, 6),
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
