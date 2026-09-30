/**
 * Operational tables and regional slices for the OCC screens.
 * Kept separate from mock.ts so the dashboard/map data stays readable.
 * Replace with API calls (TanStack Query) later.
 */
import type { HealthStatus, WorkStatus } from "@/lib/status"
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

export const maintenanceProgress: MaintenanceRow[] = [
  { id: "MT-2291", asset: "LT Panel - Block A", plant: "Mumbai Works", enterprise: "Tata Steel", country: "India", type: "Preventive", elpremar: "Suresh Kumar", scheduled: "28-05-2025", status: "completed" },
  { id: "MT-2290", asset: "Transformer - T1", plant: "Jamnagar", enterprise: "Reliance Industries", country: "India", type: "Condition Based", elpremar: "Amit Sharma", scheduled: "28-05-2025", status: "in_progress" },
  { id: "MT-2289", asset: "MCC - Unit 2", plant: "Dolvi", enterprise: "JSW Group", country: "India", type: "Corrective", elpremar: "Ramesh Patil", scheduled: "29-05-2025", status: "in_progress" },
  { id: "MT-2288", asset: "PCC - Main", plant: "Mundra", enterprise: "Adani Group", country: "India", type: "Emergency", status: "open" },
  { id: "MT-2287", asset: "HT Panel - Incomer 1", plant: "Hyderabad", enterprise: "NTPC", country: "India", type: "Preventive", elpremar: "Suresh Kumar", scheduled: "30-05-2025", status: "assigned" },
  { id: "MT-2286", asset: "APFC Panel - 1", plant: "Dubai", enterprise: "NTPC", country: "UAE", type: "Preventive", elpremar: "Khalid Rahman", scheduled: "29-05-2025", status: "in_progress" },
  { id: "MT-2285", asset: "UPS - 03", plant: "Frankfurt", enterprise: "Tata Steel", country: "Germany", type: "Corrective", elpremar: "Lukas Weber", scheduled: "30-05-2025", status: "assigned" },
  { id: "MT-2284", asset: "Switchboard - SB2", plant: "Houston", enterprise: "Reliance Industries", country: "USA", type: "Condition Based", elpremar: "Maria Lopez", scheduled: "31-05-2025", status: "in_progress" },
]

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

export const taskQueue: TaskRow[] = [
  { id: "TSK-8841", elpremar: "Suresh Kumar", enterprise: "Tata Steel", plant: "Mumbai Works", asset: "LT Panel - Block A", country: "India", activity: "Thermal Scan", due: "28-05-2025", priority: "High", status: "in_progress" },
  { id: "TSK-8840", elpremar: "Amit Sharma", enterprise: "Reliance Industries", plant: "Jamnagar", asset: "Transformer - T1", country: "India", activity: "Partial Discharge Testing", due: "28-05-2025", priority: "Critical", status: "assigned" },
  { id: "TSK-8839", elpremar: "Ramesh Patil", enterprise: "JSW Group", plant: "Dolvi", asset: "MCC - Unit 2", country: "India", activity: "Panel Cleaning (INSTA CLEAN)", due: "29-05-2025", priority: "Medium", status: "assigned" },
  { id: "TSK-8838", elpremar: "Anil Singh", enterprise: "Adani Group", plant: "Mundra", asset: "PCC - Main", country: "India", activity: "Visual Inspection", due: "27-05-2025", priority: "Low", status: "completed" },
  { id: "TSK-8837", enterprise: "NTPC", plant: "Hyderabad", asset: "HT Panel - Incomer 1", country: "India", activity: "Insulation Resistance Testing", priority: "Medium", status: "pending" },
  { id: "TSK-8836", elpremar: "Khalid Rahman", enterprise: "NTPC", plant: "Dubai", asset: "APFC Panel - 1", country: "UAE", activity: "Preventive Assessment", due: "29-05-2025", priority: "High", status: "assigned" },
  { id: "TSK-8835", enterprise: "Tata Steel", plant: "Frankfurt", asset: "Fire Alarm Panel - FA1", country: "Germany", activity: "Fire Prevention System Check", priority: "Medium", status: "pending" },
  { id: "TSK-8834", elpremar: "Maria Lopez", enterprise: "Reliance Industries", plant: "Houston", asset: "Switchboard - SB2", country: "USA", activity: "Thermal Scan", due: "01-06-2025", priority: "Low", status: "assigned" },
]

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

export const supportTickets: TicketRow[] = [
  { id: "TK-4592", enterprise: "Tata Steel", plant: "Jamshedpur", country: "India", subject: "EVITA sync failing on tablet", raised: "27-05-2025", priority: "High", status: "open" },
  { id: "TK-4591", enterprise: "JSW Group", plant: "Dolvi", country: "India", subject: "Request ELPREMAR assignment", raised: "27-05-2025", priority: "Medium", status: "open" },
  { id: "TK-4590", enterprise: "Reliance Industries", plant: "Jamnagar", country: "India", subject: "PD meter not pairing over Bluetooth", raised: "26-05-2025", elpremar: "Amit Sharma", scheduled: "28-05-2025", priority: "Critical", status: "in_progress" },
  { id: "TK-4589", enterprise: "Adani Group", plant: "Mundra", country: "India", subject: "Health report PDF not downloading", raised: "26-05-2025", elpremar: "Anil Singh", scheduled: "26-05-2025", priority: "Low", status: "closed" },
  { id: "TK-4588", enterprise: "NTPC", plant: "Kolkata", country: "India", subject: "Add new sub-division to hierarchy", raised: "25-05-2025", elpremar: "Priya Nair", scheduled: "25-05-2025", priority: "Medium", status: "closed" },
  { id: "TK-4587", enterprise: "NTPC", plant: "Dubai", country: "UAE", subject: "EMMSE dashboard loading slowly", raised: "25-05-2025", elpremar: "Khalid Rahman", scheduled: "26-05-2025", priority: "Medium", status: "closed" },
  { id: "TK-4586", enterprise: "Tata Steel", plant: "IJmuiden", country: "Netherlands", subject: "Asset QR code not scanning", raised: "24-05-2025", priority: "High", status: "open" },
  { id: "TK-4585", enterprise: "JSW Group", plant: "Sydney", country: "Australia", subject: "User access request for plant head", raised: "24-05-2025", elpremar: "Lukas Weber", scheduled: "24-05-2025", priority: "Low", status: "closed" },
]

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

/* ---------- Enterprise detail: history ---------- */

/**
 * History is generated deterministically from the enterprise id, so every record
 * has a populated detail screen and the same enterprise always shows the same
 * rows. Replace wholesale once /enterprises/:id/activities exists.
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
const workTypes = ["Preventive Maintenance", "Condition-Based Maintenance", "Fire Preventive Maintenance", "Visual Inspection", "Thermal Inspection"]
const workStatuses: WorkStatus[] = ["completed", "completed", "completed", "in_progress", "assigned", "pending"]
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
const ticketCategories = ["EVITA", "ELPREMAR", "Assets", "Hierarchy", "Instruments", "Reports", "Access", "Platform"]
const ticketPriorities: (typeof priorities)[number][] = ["Low", "Medium", "High", "Critical"]

/** Dates count back from a fixed reference so the data never shifts */
const REFERENCE = new Date(2026, 8, 28)
const dateBack = (days: number) => {
  const d = new Date(REFERENCE)
  d.setDate(d.getDate() - days)
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
}

export type EnterpriseActivity = {
  id: string
  enterpriseId: string
  date: string
  asset: string
  plant: string
  type: string
  elpremar: string
  healthBefore?: number
  healthAfter?: number
  status: WorkStatus
}

export type EnterpriseTicket = {
  id: string
  enterpriseId: string
  raised: string
  subject: string
  category: string
  priority: (typeof priorities)[number]
  status: WorkStatus
}

function buildActivities(e: EnterpriseRecord): EnterpriseActivity[] {
  const seed = seedOf(e.id)
  const assets = e.sectorType === "Retail" ? retailAssets : industryAssets
  const count = 5 + (seed % 3) // 5-7 rows, enough to fill the screen
  return Array.from({ length: count }, (_, i) => {
    const status = pick(workStatuses, seed, i)
    const before = 38 + ((seed + i * 13) % 40)
    const done = status === "completed"
    return {
      id: `MT-${3000 + (seed % 900) + i * 3}`,
      enterpriseId: e.id,
      date: dateBack(i * 9 + (seed % 5)),
      asset: pick(assets, seed, i),
      plant: `${e.city} ${pick(plantSuffixes, seed, i + 2)}`,
      type: pick(workTypes, seed, i + 1),
      elpremar: pick(elpremarPool, seed, i + 3),
      healthBefore: before,
      healthAfter: done ? Math.min(96, before + 22 + ((seed + i) % 10)) : undefined,
      status,
    }
  })
}

function buildTickets(e: EnterpriseRecord): EnterpriseTicket[] {
  const seed = seedOf(e.id)
  const count = 3 + (seed % 3) // 3-5 rows
  return Array.from({ length: count }, (_, i) => {
    const closed = (seed + i) % 3 === 0
    return {
      id: `TK-${4500 + (seed % 200) + i * 4}`,
      enterpriseId: e.id,
      raised: dateBack(i * 7 + (seed % 4)),
      subject: pick(ticketSubjects, seed, i),
      category: pick(ticketCategories, seed, i + 1),
      priority: pick(ticketPriorities, seed, i + 2),
      status: closed ? "closed" : i === 0 ? "open" : "in_progress",
    }
  })
}

export const enterpriseActivities: EnterpriseActivity[] = enterpriseRecords.flatMap(buildActivities)
export const enterpriseTickets: EnterpriseTicket[] = enterpriseRecords.flatMap(buildTickets)

export const activitiesFor = (enterpriseId: string) => enterpriseActivities.filter((a) => a.enterpriseId === enterpriseId)
export const ticketsFor = (enterpriseId: string) => enterpriseTickets.filter((t) => t.enterpriseId === enterpriseId)
