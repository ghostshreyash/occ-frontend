/**
 * Operational tables and regional slices for the OCC screens.
 * Kept separate from mock.ts so the dashboard/map data stays readable.
 * Replace with API calls (TanStack Query) later.
 */
import type { HealthStatus, WorkStatus } from "@/lib/status"
import { dialCodeFor } from "@/data/master-data"
import { activityTypes, priorities } from "@/data/mock"

type Priority = (typeof priorities)[number]

/* ---------- India slice (India Customer Map page) ---------- */

export const indiaKpis = {
  enterprises: { value: 52, change: 5 },
  plants: { value: 238, change: 4 },
  assets: { value: 38642, change: 7 },
  healthy: { value: 35150, percent: 91 },
  attention: { value: 2690, percent: 7 },
  critical: { value: 802, percent: 2 },
  elpremars: 604,
}

export const indiaEnterpriseStatus: { status: HealthStatus | "onboarding"; value: number }[] = [
  { status: "healthy", value: 34 },
  { status: "attention", value: 11 },
  { status: "critical", value: 4 },
  { status: "onboarding", value: 3 },
]

export const indiaPlantStatus: { status: HealthStatus; value: number }[] = [
  { status: "healthy", value: 176 },
  { status: "attention", value: 41 },
  { status: "critical", value: 15 },
  { status: "offline", value: 6 },
]

/* ---------- Maintenance ---------- */

export type MaintenanceRow = {
  id: string
  asset: string
  plant: string
  enterprise: string
  country: string
  type: "Preventive" | "Corrective" | "Condition Based" | "Emergency"
  /** Unassigned rows have no ELPREMAR and no scheduled date yet */
  elpremar?: string
  scheduled?: string
  status: WorkStatus
}


/* ---------- Tasks ---------- */

export type TaskRow = {
  id: string
  elpremar?: string
  enterprise: string
  plant: string
  asset: string
  country: string
  activity: string
  due?: string
  priority: Priority
  status: WorkStatus
}


/* ---------- Support tickets ---------- */

export type TicketRow = {
  id: string
  enterprise: string
  plant: string
  country: string
  subject: string
  raised: string
  elpremar?: string
  scheduled?: string
  priority: Priority
  status: WorkStatus
}


/* ---------- ELPREMAR schedule (Assign ELPREMAR dialog) ---------- */

export type ScheduleEntry = {
  date: Date
  kind: "job" | "leave"
  label: string
}

/**
 * Mock schedule for one ELPREMAR: a deterministic spread of jobs and leave
 * over the current and next two months (seeded by ELPREMAR id, so it is
 * stable between renders). Unavailable ELPREMARs start on leave today.
 * Replace with GET /elpremars/:id/schedule later.
 */
export function mockElpremarSchedule(elpremarId: string, available: boolean): ScheduleEntry[] {
  let seed = [...elpremarId].reduce((n, c) => n * 31 + c.charCodeAt(0), 7) >>> 0
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  const jobs = [...activityTypes]
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  const entries: ScheduleEntry[] = []

  for (let i = 0; i < 92; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const r = random()
    if (date.getDay() === 0) continue // Sundays off
    if (r < 0.06) {
      entries.push({ date, kind: "leave", label: "On leave" })
    } else if (r < 0.42) {
      const count = r < 0.16 ? 2 : 1
      for (let j = 0; j < count; j++) {
        entries.push({ date, kind: "job", label: jobs[Math.floor(random() * jobs.length)] })
      }
    }
  }

  if (!available) {
    for (let i = 0; i < 5; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i)
      entries.push({ date, kind: "leave", label: "On leave" })
    }
  }
  return entries
}

/* ---------- Enterprise register (Enterprise Onboarding landing) ---------- */

export type EnterpriseRecord = {
  id: string
  name: string
  /** "Industry" or "Retail" - see master-data.sectorTypes */
  sectorType: string
  /** Sector within that type - see master-data.sectorsFor() */
  sector: string
  country: string
  city: string
  plants: number
  assets: number
  elpremars: number
  onboarded: string
  status: HealthStatus | "onboarding"
}

export const enterpriseRecords: EnterpriseRecord[] = [
  { id: "TSL-ENT-001", name: "Tata Steel Limited", sectorType: "Industry", sector: "Large Cap", country: "India", city: "Mumbai", plants: 12, assets: 6842, elpremars: 48, onboarded: "12-01-2024", status: "healthy" },
  { id: "RIL-ENT-002", name: "Reliance Industries", sectorType: "Industry", sector: "Large Cap", country: "India", city: "Jamnagar", plants: 9, assets: 5921, elpremars: 41, onboarded: "03-03-2024", status: "attention" },
  { id: "JSW-ENT-003", name: "JSW Group", sectorType: "Industry", sector: "Large Cap", country: "India", city: "Dolvi", plants: 11, assets: 4876, elpremars: 36, onboarded: "22-04-2024", status: "healthy" },
  { id: "ADN-ENT-004", name: "Adani Group", sectorType: "Industry", sector: "Large Cap", country: "India", city: "Mundra", plants: 8, assets: 3994, elpremars: 29, onboarded: "17-06-2024", status: "critical" },
  { id: "NTP-ENT-005", name: "NTPC", sectorType: "Industry", sector: "Government / PSU", country: "India", city: "Hyderabad", plants: 14, assets: 3118, elpremars: 33, onboarded: "09-08-2024", status: "healthy" },
  { id: "ABC-ENT-006", name: "ABC Industries Ltd.", sectorType: "Industry", sector: "MSME", country: "India", city: "Hosur", plants: 3, assets: 962, elpremars: 8, onboarded: "27-05-2025", status: "onboarding" },
  { id: "EMR-ENT-007", name: "Emirates Steel", sectorType: "Industry", sector: "Mid Cap", country: "United Arab Emirates", city: "Dubai", plants: 4, assets: 1488, elpremars: 12, onboarded: "14-11-2024", status: "attention" },
  { id: "SBC-ENT-008", name: "SABIC", sectorType: "Industry", sector: "Large Cap", country: "Saudi Arabia", city: "Riyadh", plants: 6, assets: 2104, elpremars: 18, onboarded: "02-12-2024", status: "healthy" },
  { id: "THY-ENT-009", name: "Thyssenkrupp AG", sectorType: "Industry", sector: "Large Cap", country: "Germany", city: "Frankfurt", plants: 5, assets: 1776, elpremars: 15, onboarded: "19-01-2025", status: "healthy" },
  { id: "SGX-ENT-010", name: "Singapore Grid Co.", sectorType: "Retail", sector: "Commercial Offices", country: "Singapore", city: "Singapore", plants: 2, assets: 806, elpremars: 7, onboarded: "05-02-2025", status: "healthy" },
  { id: "HIN-ENT-011", name: "Hindalco Industries", sectorType: "Industry", sector: "Large Cap", country: "India", city: "Renukoot", plants: 7, assets: 2914, elpremars: 24, onboarded: "11-09-2024", status: "attention" },
  { id: "VED-ENT-012", name: "Vedanta Limited", sectorType: "Industry", sector: "Large Cap", country: "India", city: "Jharsuguda", plants: 10, assets: 3640, elpremars: 31, onboarded: "28-10-2024", status: "healthy" },
  { id: "BPC-ENT-013", name: "Bharat Petroleum", sectorType: "Industry", sector: "Government / PSU", country: "India", city: "Kochi", plants: 6, assets: 2488, elpremars: 21, onboarded: "16-12-2024", status: "critical" },
  { id: "UTC-ENT-014", name: "UltraTech Cement", sectorType: "Industry", sector: "Mid Cap", country: "India", city: "Ahmedabad", plants: 9, assets: 2176, elpremars: 19, onboarded: "22-01-2025", status: "healthy" },
  { id: "DRL-ENT-015", name: "Dr. Reddy's Labs", sectorType: "Industry", sector: "Mid Cap", country: "India", city: "Hyderabad", plants: 4, assets: 1352, elpremars: 14, onboarded: "07-03-2025", status: "attention" },
  { id: "TAT-ENT-016", name: "Tata Steel Europe", sectorType: "Industry", sector: "Large Cap", country: "Netherlands", city: "IJmuiden", plants: 5, assets: 2042, elpremars: 17, onboarded: "19-09-2024", status: "attention" },
  { id: "LYB-ENT-017", name: "LyondellBasell", sectorType: "Industry", sector: "Large Cap", country: "United States", city: "Houston", plants: 7, assets: 2760, elpremars: 23, onboarded: "04-11-2024", status: "healthy" },
  { id: "VAL-ENT-018", name: "Vale S.A.", sectorType: "Industry", sector: "Large Cap", country: "Brazil", city: "São Paulo", plants: 6, assets: 1988, elpremars: 16, onboarded: "13-02-2025", status: "critical" },
  { id: "ESK-ENT-019", name: "Eskom Holdings", sectorType: "Industry", sector: "Government / PSU", country: "South Africa", city: "Johannesburg", plants: 8, assets: 2314, elpremars: 20, onboarded: "26-03-2025", status: "healthy" },
  { id: "BHP-ENT-020", name: "BHP Group", sectorType: "Industry", sector: "Large Cap", country: "Australia", city: "Sydney", plants: 3, assets: 1104, elpremars: 11, onboarded: "09-06-2025", status: "onboarding" },
]

export const enterpriseRegisterKpis = {
  total: enterpriseRecords.length,
  active: enterpriseRecords.filter((e) => e.status !== "onboarding").length,
  onboarding: enterpriseRecords.filter((e) => e.status === "onboarding").length,
  plants: enterpriseRecords.reduce((n, e) => n + e.plants, 0),
  /*
   * Absolute month-over-month movement. These are counts in the tens, so a
   * percentage would round to a fraction of an enterprise and read as noise.
   * "Onboarded" gets no trend at all - it is a running count, not a trend.
   */
  delta: { total: 2, active: 2, plants: 9 },
}

/** Priority pill colours, matching the health/alert token families */
export const priorityTone: Record<Priority, string> = {
  Low: "bg-neutral-soft text-neutral-soft-foreground",
  Medium: "bg-info-soft text-info-soft-foreground",
  High: "bg-attention-soft text-attention-soft-foreground",
  Critical: "bg-critical-soft text-critical-soft-foreground",
}

/* ---------- Per-enterprise operations rows ---------- */

/**
 * The dashboard tables show every enterprise; the detail screen filters the same
 * rows to one. Generating them here keeps both reading from one dataset, so the
 * columns and the data can never drift apart.
 */

/** Stable hash so a given enterprise always draws the same values */
const seedOf = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
const pick = <T,>(pool: readonly T[], seed: number, offset: number) => pool[(seed + offset * 7) % pool.length]

/** Industrial sites and retail sites run very different equipment */
const industryAssets = [
  "11kV/415V Power Transformer - T1",
  "HT Panel - Incomer 1",
  "LT Panel - Block A",
  "MCC - Unit 2",
  "PCC - Main",
  "APFC Panel - 1",
  "VFD - Conveyor Drive",
  "Busbar Chamber - Main",
  "ACB - Incomer",
  "Relay Panel - Protection",
]
const retailAssets = [
  "Lighting Distribution Board - Level 2",
  "Distribution Board - Admin Wing",
  "UPS - Server Room",
  "APFC Panel - Basement",
  "LT Panel - Chiller Plant",
  "Battery Bank - Backup",
  "Fire Alarm Panel - Atrium",
  "Sub Distribution Board - Retail Floor",
]
const plantSuffixes = ["Main Plant", "Unit 2", "Substation", "Utility Block", "Warehouse", "Annexe"]
const elpremarPool = ["Suresh Kumar", "Amit Sharma", "Ramesh Patil", "Anil Singh", "Priya Nair", "Vikram Desai"]
const maintenanceKinds: MaintenanceRow["type"][] = ["Preventive", "Corrective", "Condition Based", "Emergency"]
const activityKinds = [
  "Visual Inspection",
  "Thermal Inspection",
  "Partial Discharge Testing",
  "Insulation Resistance Testing",
  "Panel Cleaning (INSTA CLEAN)",
  "Fire Prevention System Check",
]
const workStatusPool: WorkStatus[] = ["completed", "completed", "in_progress", "assigned", "pending", "open"]
const ticketSubjects = [
  "EVITA sync failing on tablet",
  "Request additional ELPREMAR for shutdown",
  "Asset QR code not scanning after relabelling",
  "Add new sub-department under Electrical",
  "PD meter not pairing over Bluetooth",
  "Health report PDF not downloading",
  "User access request for new plant head",
  "EMMSE dashboard loading slowly",
  "Thermal images not uploading from the field",
  "Correct the plant capacity on record",
]
const priorityPool: Priority[] = ["Low", "Medium", "High", "Critical"]

/** Dates count back from a fixed reference so the data never shifts */
const REFERENCE = new Date(2026, 8, 28)
const dateBack = (days: number) => {
  const d = new Date(REFERENCE)
  d.setDate(d.getDate() - days)
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
}

const assetsFor = (e: EnterpriseRecord) => (e.sectorType === "Retail" ? retailAssets : industryAssets)
const plantName = (e: EnterpriseRecord, seed: number, i: number) => `${e.city} ${pick(plantSuffixes, seed, i + 2)}`

function buildMaintenance(e: EnterpriseRecord): MaintenanceRow[] {
  const seed = seedOf(e.id)
  return Array.from({ length: 5 + (seed % 3) }, (_, i) => {
    const status = pick(workStatusPool, seed, i)
    const unassigned = status === "open" || status === "pending"
    return {
      id: `MT-${3000 + (seed % 900) + i * 3}`,
      asset: pick(assetsFor(e), seed, i),
      plant: plantName(e, seed, i),
      enterprise: e.name,
      country: e.country,
      type: pick(maintenanceKinds, seed, i + 1),
      elpremar: unassigned ? undefined : pick(elpremarPool, seed, i + 3),
      scheduled: unassigned ? undefined : dateBack(i * 9 + (seed % 5)),
      status,
    }
  })
}

function buildTasks(e: EnterpriseRecord): TaskRow[] {
  const seed = seedOf(e.id)
  return Array.from({ length: 4 + (seed % 3) }, (_, i) => {
    const status = pick(workStatusPool, seed, i + 2)
    const unassigned = status === "open" || status === "pending"
    return {
      id: `TSK-${8000 + (seed % 800) + i * 5}`,
      elpremar: unassigned ? undefined : pick(elpremarPool, seed, i + 1),
      enterprise: e.name,
      plant: plantName(e, seed, i + 1),
      asset: pick(assetsFor(e), seed, i + 2),
      country: e.country,
      activity: pick(activityKinds, seed, i),
      due: unassigned ? undefined : dateBack(i * 6 + (seed % 4)),
      priority: pick(priorityPool, seed, i + 3),
      status,
    }
  })
}

function buildTickets(e: EnterpriseRecord): TicketRow[] {
  const seed = seedOf(e.id)
  return Array.from({ length: 3 + (seed % 3) }, (_, i) => {
    const closed = (seed + i) % 3 === 0
    return {
      id: `TK-${4500 + (seed % 200) + i * 4}`,
      enterprise: e.name,
      plant: plantName(e, seed, i + 3),
      country: e.country,
      subject: pick(ticketSubjects, seed, i),
      raised: dateBack(i * 7 + (seed % 4)),
      elpremar: closed ? pick(elpremarPool, seed, i + 4) : undefined,
      scheduled: closed ? dateBack(i * 7) : undefined,
      priority: pick(priorityPool, seed, i + 2),
      status: closed ? "closed" : i === 0 ? "open" : "in_progress",
    }
  })
}

/* ---------- Enterprise detail: full onboarding profile ---------- */

/** One department inside a plant, with its own sub-departments */
export type DepartmentProfile = {
  id: string
  name: string
  code: string
  type: string
  parent: string
  salutation: string
  head: string
  email: string
  phoneCode: string
  phone: string
  description: string
  subDepartments: { name: string; code: string; function: string; description?: string }[]
}

/** One plant, with the departments that sit under it */
export type PlantProfile = {
  id: string
  name: string
  type: string
  code: string
  salutation: string
  head: string
  email: string
  phoneCode: string
  phone: string
  capacity: string
  capacityUnit: string
  commissioningDate: string
  timeZone: string
  address: string
  notes: string
  departments: DepartmentProfile[]
}

/**
 * Everything captured during onboarding. An enterprise has many plants, each
 * with its own departments; the administrator account is enterprise-level and
 * shared across every plant.
 */
export type EnterpriseProfile = {
  enterprise: { name: string; shortName: string; sectorType: string; sector: string; website: string; description: string }
  location: { country: string; state: string; city: string; pin: string; latitude: string; longitude: string; address: string }
  plants: PlantProfile[]
  account: { email: string; role: string; lastLogin: string }
}

const stateFor: Record<string, string> = {
  Mumbai: "Maharashtra", Jamnagar: "Gujarat", Dolvi: "Maharashtra", Mundra: "Gujarat",
  Hyderabad: "Telangana", Hosur: "Tamil Nadu", Renukoot: "Uttar Pradesh", Jharsuguda: "Odisha",
  Kochi: "Kerala", Ahmedabad: "Gujarat", Dubai: "Dubai", Riyadh: "Riyadh Province",
  Frankfurt: "Hesse", Singapore: "Singapore", IJmuiden: "North Holland", Houston: "Texas",
  "Sao Paulo": "Sao Paulo", Johannesburg: "Gauteng", Sydney: "New South Wales",
}
const coordsFor: Record<string, [string, string]> = {
  Mumbai: ["19.0760", "72.8777"], Jamnagar: ["22.4707", "70.0577"], Dolvi: ["18.7000", "73.0000"],
  Mundra: ["22.8394", "69.7219"], Hyderabad: ["17.3850", "78.4867"], Hosur: ["12.7409", "77.8253"],
  Renukoot: ["24.2000", "83.0333"], Jharsuguda: ["21.8558", "84.0062"], Kochi: ["9.9312", "76.2673"],
  Ahmedabad: ["23.0225", "72.5714"], Dubai: ["25.2048", "55.2708"], Riyadh: ["24.7136", "46.6753"],
  Frankfurt: ["50.1109", "8.6821"], Singapore: ["1.3521", "103.8198"], IJmuiden: ["52.4607", "4.6103"],
  Houston: ["29.7604", "-95.3698"], Johannesburg: ["-26.2041", "28.0473"], Sydney: ["-33.8688", "151.2093"],
}
const industryPlantTypes = ["Integrated Steel Plant", "Refinery", "Power Plant", "Cement Plant", "Manufacturing Unit"]
const retailPlantTypes = ["Commercial Complex", "Shopping Centre", "Data Centre", "Facility Block"]
const deptPool = ["Electrical", "Maintenance", "Operations", "Engineering", "Utilities", "Instrumentation & Control", "Safety"]
const subDeptPool = [
  { name: "HT Maintenance", code: "HT", function: "Maintenance", description: "High tension equipment maintenance" },
  { name: "LT Maintenance", code: "LT", function: "Maintenance", description: "Low tension equipment maintenance" },
  { name: "Panels & Switchgear", code: "PS", function: "Operations", description: "Panels, switchgear and control" },
  { name: "Transformers", code: "TF", function: "Maintenance", description: "Transformer maintenance" },
  { name: "Protection & Relay", code: "PR", function: "Testing", description: "Relay testing and calibration" },
]
const capacityValues = ["5", "12", "8", "3.5", "20", "450"]
const capacityUnitPool = ["MTPA", "MW", "MVA", "MTPA", "MW", "kVA"]
const timeZonesByCountry: Record<string, string> = {
  India: "(UTC+05:30) India Standard Time",
  "United Arab Emirates": "(UTC+04:00) Gulf Standard Time",
  "Saudi Arabia": "(UTC+03:00) Arabia Standard Time",
  Singapore: "(UTC+08:00) Singapore Time",
  Germany: "(UTC+01:00) Central European Time",
  Netherlands: "(UTC+01:00) Central European Time",
  "United States": "(UTC-06:00) Central Time",
  Brazil: "(UTC-03:00) Brasilia Time",
  "South Africa": "(UTC+02:00) South Africa Standard Time",
  Australia: "(UTC+10:00) Australian Eastern Time",
}

/** Build the full onboarding profile for one enterprise, deterministically */
export function profileFor(e: EnterpriseRecord): EnterpriseProfile {
  const seed = seedOf(e.id)
  const slug = e.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10)
  const [lat, lng] = coordsFor[e.city] ?? ["0.0000", "0.0000"]
  const plantTypePool = e.sectorType === "Retail" ? retailPlantTypes : industryPlantTypes
  const short = e.id.slice(0, 3)
  const mail = (name: string) => name.toLowerCase().replace(/ /g, ".") + "@" + slug + ".com"

  const plants: PlantProfile[] = Array.from({ length: Math.min(e.plants, 12) }, (_, i) => {
    const s = seed + i * 101
    const head = pick(elpremarPool, s, 4)
    const commissioned = new Date(2016 + (s % 9), s % 12, 1 + (s % 27))

    const departments: DepartmentProfile[] = Array.from({ length: 2 + (s % 3) }, (_, j) => {
      const ds = s + j * 37
      const dName = deptPool[(ds + j) % deptPool.length]
      const dHead = pick(elpremarPool, ds, 6)
      return {
        id: short + "-P" + (i + 1) + "-D" + (j + 1),
        name: dName,
        code: "DEP-" + dName.slice(0, 2).toUpperCase() + "-" + (i + 1) + (j + 1),
        type: dName,
        parent: j === 0 ? "" : "Engineering",
        salutation: ds % 4 === 0 ? "Ms." : "Mr.",
        head: dHead,
        email: mail(dHead),
        phoneCode: dialCodeFor(e.country),
        phone: String(8000000000 + (ds % 899999999)).slice(0, 10),
        description: dName + " systems and reliability activities for this plant.",
        subDepartments: subDeptPool.slice(0, 2 + (ds % 3)).map((sd) => ({
          ...sd,
          code: "SUB-" + short + "-" + sd.code + (i + 1) + (j + 1),
        })),
      }
    })

    return {
      id: short + "-P" + (i + 1),
      name: e.city + " " + pick(plantSuffixes, s, 2) + (i > 0 ? " " + (i + 1) : ""),
      type: pick(plantTypePool, s, 3),
      code: short + "-" + e.city.slice(0, 3).toUpperCase() + "-" + String(i + 1).padStart(3, "0"),
      salutation: s % 5 === 0 ? "Dr." : s % 3 === 0 ? "Ms." : "Mr.",
      head,
      email: mail(head),
      phoneCode: dialCodeFor(e.country),
      phone: String(9000000000 + (s % 899999999)).slice(0, 10),
      capacity: pick(capacityValues, s, 5),
      capacityUnit: pick(capacityUnitPool, s, 5),
      commissioningDate:
        commissioned.getFullYear() +
        "-" + String(commissioned.getMonth() + 1).padStart(2, "0") +
        "-" + String(commissioned.getDate()).padStart(2, "0"),
      timeZone: timeZonesByCountry[e.country] ?? "(UTC+00:00) GMT",
      address: pick(plantSuffixes, s, 2) + ", " + e.city + ", " + e.country,
      notes: "Registered during initial enterprise onboarding.",
      departments,
    }
  })

  return {
    enterprise: {
      name: e.name,
      shortName: short,
      sectorType: e.sectorType,
      sector: e.sector,
      website: "https://www." + slug + ".com",
      description: e.name + " is registered with OLIVINE for electrical reliability management across " + e.plants + " plants.",
    },
    location: {
      country: e.country,
      state: stateFor[e.city] ?? e.country,
      city: e.city,
      pin: String(100000 + (seed % 800000)),
      latitude: lat,
      longitude: lng,
      address: e.name + ", " + pick(plantSuffixes, seed, 1) + ", " + e.city + ", " + e.country,
    },
    plants,
    // One administrator for the whole enterprise, shared across every plant
    account: {
      email: "admin@" + slug + ".com",
      role: "Enterprise Admin",
      lastLogin: dateBack(seed % 6),
    },
  }
}

/*
 * Generated last: these read enterpriseRecords *and* the pools/helpers above.
 * Keep them at the end of the module - hoisted function declarations still
 * close over `const` pools, which are in the temporal dead zone until declared.
 */
export const maintenanceProgress: MaintenanceRow[] = enterpriseRecords.flatMap(buildMaintenance)
export const taskQueue: TaskRow[] = enterpriseRecords.flatMap(buildTasks)
export const supportTickets: TicketRow[] = enterpriseRecords.flatMap(buildTickets)

/**
 * Asset health split for one enterprise. The record carries a total and an
 * overall status; these are the per-band counts behind that status, using the
 * platform's Healthy / Attention Required / Poor Condition bands.
 */
export function assetHealthFor(e: EnterpriseRecord) {
  const mix =
    e.status === "critical"
      ? { healthy: 0.58, attention: 0.27 }
      : e.status === "attention"
        ? { healthy: 0.74, attention: 0.2 }
        : { healthy: 0.91, attention: 0.07 }
  const healthy = Math.round(e.assets * mix.healthy)
  const attention = Math.round(e.assets * mix.attention)
  return { healthy, attention, critical: e.assets - healthy - attention }
}
