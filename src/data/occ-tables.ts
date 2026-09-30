/**
 * Operational tables and regional slices for the OCC screens.
 * Kept separate from mock.ts so the dashboard/map data stays readable.
 * Replace with API calls (TanStack Query) later.
 */
import { addDays, format } from "date-fns"

import type { HealthStatus, WorkStatus } from "@/lib/status"
import { activityTypes, assetCategories, priorities } from "@/data/mock"

type Priority = (typeof priorities)[number]

/**
 * Mock bookings are pinned to today rather than to fixed dates, so the console
 * always shows live work and the assign dialog can open on a row's own day.
 * `day(2)` is the day after tomorrow. Drop this once the tables come from the API.
 */
const day = (offset: number) => format(addDays(new Date(), offset), "dd-MM-yyyy")

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

/* ---------- Working day ---------- */

/** Hour-long intervals a job can be booked into (09:00 - 18:00) */
export const daySlots = [9, 10, 11, 12, 13, 14, 15, 16, 17]

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`

/** 14 -> "14:00 - 15:00" */
export const slotLabel = (hour: number) => `${hh(hour)} - ${hh(hour + 1)}`

/**
 * Slot for a job the mock data records no time for. Hashing the job's own key
 * keeps it stable between renders without putting a time on every legacy row.
 */
export function slotFor(key: string) {
  const n = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  return daySlots[n % daySlots.length]
}

/* ---------- Maintenance ---------- */

/** The maintenance programmes an activity can belong to */
export const maintenanceTypes = ["Preventive", "Condition-Based", "Fire Preventive"] as const

export type MaintenanceType = (typeof maintenanceTypes)[number]

export type MaintenanceRow = {
  id: string
  asset: string
  plant: string
  enterprise: string
  country: string
  type: MaintenanceType
  /** Planned work is always owned and booked, so these are never blank */
  elpremar: string
  scheduled: string
  /** Hour the booked interval starts */
  slot: number
  status: WorkStatus
}

export const maintenanceProgress: MaintenanceRow[] = [
  { id: "MT-2291", asset: "LT Panel - Block A", plant: "Mumbai Works", enterprise: "Tata Steel", country: "India", type: "Preventive", elpremar: "Suresh Kumar", scheduled: day(-2), slot: 9, status: "completed" },
  { id: "MT-2290", asset: "Transformer - T1", plant: "Jamnagar", enterprise: "Reliance Industries", country: "India", type: "Condition-Based", elpremar: "Amit Sharma", scheduled: day(0), slot: 10, status: "open" },
  { id: "MT-2289", asset: "MCC - Unit 2", plant: "Dolvi", enterprise: "JSW Group", country: "India", type: "Preventive", elpremar: "Ramesh Patil", scheduled: day(0), slot: 9, status: "in_progress" },
  { id: "MT-2288", asset: "PCC - Main", plant: "Mundra", enterprise: "Adani Group", country: "India", type: "Fire Preventive", elpremar: "Anil Singh", scheduled: day(2), slot: 11, status: "open" },
  // Deliberately shares Suresh Kumar's 10:00 slot with TSK-8837, so the dialog has a clash to show
  { id: "MT-2287", asset: "HT Panel - Incomer 1", plant: "Hyderabad", enterprise: "NTPC", country: "India", type: "Preventive", elpremar: "Suresh Kumar", scheduled: day(3), slot: 10, status: "assigned" },
  { id: "MT-2286", asset: "APFC Panel - 1", plant: "Dubai", enterprise: "NTPC", country: "UAE", type: "Preventive", elpremar: "Khalid Rahman", scheduled: day(1), slot: 11, status: "open" },
  { id: "MT-2285", asset: "UPS - 03", plant: "Frankfurt", enterprise: "Tata Steel", country: "Germany", type: "Fire Preventive", elpremar: "Lukas Weber", scheduled: day(4), slot: 10, status: "assigned" },
  { id: "MT-2284", asset: "Switchboard - SB2", plant: "Houston", enterprise: "Reliance Industries", country: "USA", type: "Condition-Based", elpremar: "Maria Lopez", scheduled: day(1), slot: 15, status: "open" },
]

/**
 * The dashboard panel shows the latest few; the Maintenance Activities screen
 * shows the whole book of work. Generated from fixed pools with a seeded RNG so
 * ids, owners and intervals stay put between renders, and so nobody is booked
 * into the same interval twice. Replace with GET /maintenance-activities later.
 */
const sites = [
  { enterprise: "Tata Steel", plant: "Mumbai Works", country: "India" },
  { enterprise: "Tata Steel", plant: "Jamshedpur", country: "India" },
  { enterprise: "Reliance Industries", plant: "Jamnagar", country: "India" },
  { enterprise: "JSW Group", plant: "Dolvi", country: "India" },
  { enterprise: "Adani Group", plant: "Mundra", country: "India" },
  { enterprise: "NTPC", plant: "Hyderabad", country: "India" },
  { enterprise: "NTPC", plant: "Kolkata", country: "India" },
  { enterprise: "NTPC", plant: "Dubai", country: "UAE" },
  { enterprise: "Tata Steel", plant: "Frankfurt", country: "Germany" },
  { enterprise: "Tata Steel", plant: "IJmuiden", country: "Netherlands" },
  { enterprise: "Reliance Industries", plant: "Houston", country: "USA" },
  { enterprise: "JSW Group", plant: "Sydney", country: "Australia" },
]

const crew = ["Suresh Kumar", "Amit Sharma", "Ramesh Patil", "Anil Singh", "Priya Nair", "Khalid Rahman", "Lukas Weber", "Maria Lopez"]
const units = ["Block A", "Block B", "Unit 1", "Unit 2", "Unit 3", "Main", "Incomer 1", "Incomer 2", "T1", "T2", "SB1", "SB2", "03", "04"]
const workStates: WorkStatus[] = ["open", "assigned", "in_progress", "completed"]

function moreMaintenance(count: number): MaintenanceRow[] {
  let seed = 20250528
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  const pick = <T,>(pool: T[]) => pool[Math.floor(random() * pool.length)]
  const taken = new Set(maintenanceProgress.map((m) => `${m.elpremar}|${m.scheduled}|${m.slot}`))
  const rows: MaintenanceRow[] = []

  for (let i = 0; i < count; i++) {
    const site = pick(sites)
    const elpremar = pick(crew)
    const scheduled = day(Math.floor(random() * 50) - 28)
    let slot = pick(daySlots)
    // Shift along the day rather than book the same person twice at once
    for (let n = 0; n < daySlots.length && taken.has(`${elpremar}|${scheduled}|${slot}`); n++)
      slot = daySlots[(daySlots.indexOf(slot) + 1) % daySlots.length]
    taken.add(`${elpremar}|${scheduled}|${slot}`)

    rows.push({
      id: `MT-${2283 - i}`,
      asset: `${pick(assetCategories)} - ${pick(units)}`,
      plant: site.plant,
      enterprise: site.enterprise,
      country: site.country,
      type: pick([...maintenanceTypes]),
      elpremar,
      scheduled,
      slot,
      status: pick(workStates),
    })
  }
  return rows
}

/** Everything on the books, newest id first — what the Maintenance Activities screen lists */
export const maintenanceActivities: MaintenanceRow[] = [...maintenanceProgress, ...moreMaintenance(44)]

/* ---------- Tasks ---------- */

/** An inspection task only ever waits, runs or finishes — there is no separate assigned state */
export type TaskStatus = Extract<WorkStatus, "pending" | "in_progress" | "completed">

export type TaskRow = {
  id: string
  /** Owned and booked from the start, so these are never blank */
  elpremar: string
  enterprise: string
  plant: string
  asset: string
  country: string
  /** An inspection activity — cleaning is maintenance work and belongs on that tab */
  activity: string
  due: string
  /** Hour the booked interval starts */
  slot: number
  priority: Priority
  status: TaskStatus
}

export const taskQueue: TaskRow[] = [
  { id: "TSK-8841", elpremar: "Suresh Kumar", enterprise: "Tata Steel", plant: "Mumbai Works", asset: "LT Panel - Block A", country: "India", activity: "Thermal Scan", due: day(0), slot: 11, priority: "High", status: "in_progress" },
  { id: "TSK-8840", elpremar: "Amit Sharma", enterprise: "Reliance Industries", plant: "Jamnagar", asset: "Transformer - T1", country: "India", activity: "Partial Discharge Testing", due: day(2), slot: 11, priority: "Critical", status: "pending" },
  { id: "TSK-8839", elpremar: "Ramesh Patil", enterprise: "JSW Group", plant: "Dolvi", asset: "MCC - Unit 2", country: "India", activity: "Visual Inspection", due: day(3), slot: 11, priority: "Medium", status: "pending" },
  { id: "TSK-8838", elpremar: "Anil Singh", enterprise: "Adani Group", plant: "Mundra", asset: "PCC - Main", country: "India", activity: "Preventive Assessment", due: day(-3), slot: 10, priority: "Low", status: "completed" },
  { id: "TSK-8837", elpremar: "Suresh Kumar", enterprise: "NTPC", plant: "Hyderabad", asset: "HT Panel - Incomer 1", country: "India", activity: "Insulation Resistance Testing", due: day(3), slot: 10, priority: "Medium", status: "pending" },
  { id: "TSK-8836", elpremar: "Khalid Rahman", enterprise: "NTPC", plant: "Dubai", asset: "APFC Panel - 1", country: "UAE", activity: "Preventive Assessment", due: day(2), slot: 9, priority: "High", status: "pending" },
  { id: "TSK-8835", elpremar: "Lukas Weber", enterprise: "Tata Steel", plant: "Frankfurt", asset: "Fire Alarm Panel - FA1", country: "Germany", activity: "Fire Prevention System Check", due: day(4), slot: 14, priority: "Medium", status: "pending" },
  { id: "TSK-8834", elpremar: "Maria Lopez", enterprise: "Reliance Industries", plant: "Houston", asset: "Switchboard - SB2", country: "USA", activity: "Thermal Scan", due: day(5), slot: 9, priority: "Low", status: "pending" },
]

/**
 * The dashboard panel shows the latest few; the Inspection Activities screen
 * shows the whole queue. Same seeded approach as the maintenance book, and it
 * checks the maintenance bookings too so nobody is sent to two jobs at once.
 */
const inspectionWork = activityTypes.filter((a) => a !== "Panel Cleaning (INSTA CLEAN)")

function moreInspections(count: number): TaskRow[] {
  let seed = 20250529
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
  const pick = <T,>(pool: T[]) => pool[Math.floor(random() * pool.length)]
  const taken = new Set(
    [...maintenanceActivities.map((m) => `${m.elpremar}|${m.scheduled}|${m.slot}`),
     ...taskQueue.map((t) => `${t.elpremar}|${t.due}|${t.slot}`)]
  )
  const states: TaskStatus[] = ["pending", "in_progress", "completed"]
  const rows: TaskRow[] = []

  for (let i = 0; i < count; i++) {
    const site = pick(sites)
    const elpremar = pick(crew)
    const due = day(Math.floor(random() * 50) - 28)
    let slot = pick(daySlots)
    for (let n = 0; n < daySlots.length && taken.has(`${elpremar}|${due}|${slot}`); n++)
      slot = daySlots[(daySlots.indexOf(slot) + 1) % daySlots.length]
    taken.add(`${elpremar}|${due}|${slot}`)

    rows.push({
      id: `TSK-${8833 - i}`,
      elpremar,
      enterprise: site.enterprise,
      plant: site.plant,
      asset: `${pick(assetCategories)} - ${pick(units)}`,
      country: site.country,
      activity: pick(inspectionWork),
      due,
      slot,
      priority: pick([...priorities]),
      status: pick(states),
    })
  }
  return rows
}

/** The whole inspection queue — what the Inspection Activities screen lists */
export const inspectionActivities: TaskRow[] = [...taskQueue, ...moreInspections(44)]

/* ---------- Support tickets ---------- */

/**
 * What the ticket is about; drives the Category column on the tickets table.
 * Technical = field device / instrument faults, System = OCC platform and app
 * issues, Asset = panel or QR/asset-record problems, Access = user and role
 * requests, Report = health reports and exports, Assignment = ELPREMAR requests.
 */
export const ticketCategories = ["Technical", "Access", "Asset", "Report", "System", "Assignment"] as const

export type TicketCategory = (typeof ticketCategories)[number]

export type TicketRow = {
  id: string
  enterprise: string
  plant: string
  country: string
  subject: string
  category: TicketCategory
  raised: string
  /** Who the ticket is assigned to (ELPREMAR or OCC desk owner) */
  elpremar?: string
  scheduled?: string
  /** Hour the booked interval starts */
  slot?: number
  priority: Priority
  status: WorkStatus
  /** What was done about it, captured when the ticket is closed */
  resolution?: string
}

export const supportTickets: TicketRow[] = [
  { id: "TK-4592", enterprise: "Tata Steel", plant: "Jamshedpur", country: "India", subject: "EVITA sync failing on tablet", category: "System", raised: day(-1), priority: "High", status: "open" },
  { id: "TK-4591", enterprise: "JSW Group", plant: "Dolvi", country: "India", subject: "Request ELPREMAR assignment", category: "Assignment", raised: day(-1), priority: "Medium", status: "open" },
  { id: "TK-4590", enterprise: "Reliance Industries", plant: "Jamnagar", country: "India", subject: "PD meter not pairing over Bluetooth", category: "Technical", raised: day(-2), elpremar: "Amit Sharma", scheduled: day(1), priority: "Critical", status: "in_progress" },
  { id: "TK-4589", enterprise: "Adani Group", plant: "Mundra", country: "India", subject: "Health report PDF not downloading", category: "Report", raised: day(-2), elpremar: "Anil Singh", scheduled: day(-2), priority: "Low", status: "closed" },
  { id: "TK-4588", enterprise: "NTPC", plant: "Kolkata", country: "India", subject: "Add new sub-division to hierarchy", category: "System", raised: day(-3), elpremar: "Priya Nair", scheduled: day(-3), priority: "Medium", status: "closed" },
  { id: "TK-4587", enterprise: "NTPC", plant: "Dubai", country: "UAE", subject: "EMMSE dashboard loading slowly", category: "System", raised: day(-3), elpremar: "Khalid Rahman", scheduled: day(-2), priority: "Medium", status: "closed" },
  { id: "TK-4586", enterprise: "Tata Steel", plant: "IJmuiden", country: "Netherlands", subject: "Asset QR code not scanning", category: "Asset", raised: day(-4), priority: "High", status: "open" },
  { id: "TK-4585", enterprise: "JSW Group", plant: "Sydney", country: "Australia", subject: "User access request for plant head", category: "Access", raised: day(-4), elpremar: "Lukas Weber", scheduled: day(-4), priority: "Low", status: "closed" },
]

/* ---------- ELPREMAR schedule (Assign ELPREMAR dialog) ---------- */

export type ScheduleEntry = {
  date: Date
  kind: "job" | "leave"
  label: string
  /** Hour the job starts; leave covers the whole day and has no slot */
  slot?: number
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
      const taken = new Set<number>()
      for (let j = 0; j < count; j++) {
        // Two jobs on one day must not land in the same interval
        let k = Math.floor(random() * daySlots.length)
        while (taken.has(daySlots[k])) k = (k + 1) % daySlots.length
        taken.add(daySlots[k])
        entries.push({ date, kind: "job", label: jobs[Math.floor(random() * jobs.length)], slot: daySlots[k] })
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
  type: string
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
  { id: "TSL-ENT-001", name: "Tata Steel Limited", type: "Manufacturing", sector: "Steel & Metals", country: "India", city: "Mumbai", plants: 12, assets: 6842, elpremars: 48, onboarded: "12-01-2024", status: "healthy" },
  { id: "RIL-ENT-002", name: "Reliance Industries", type: "Oil & Gas", sector: "Petrochemicals", country: "India", city: "Jamnagar", plants: 9, assets: 5921, elpremars: 41, onboarded: "03-03-2024", status: "attention" },
  { id: "JSW-ENT-003", name: "JSW Group", type: "Manufacturing", sector: "Steel & Metals", country: "India", city: "Dolvi", plants: 11, assets: 4876, elpremars: 36, onboarded: "22-04-2024", status: "healthy" },
  { id: "ADN-ENT-004", name: "Adani Group", type: "Power & Utilities", sector: "Power Generation", country: "India", city: "Mundra", plants: 8, assets: 3994, elpremars: 29, onboarded: "17-06-2024", status: "critical" },
  { id: "NTP-ENT-005", name: "NTPC", type: "Power & Utilities", sector: "Power Generation", country: "India", city: "Hyderabad", plants: 14, assets: 3118, elpremars: 33, onboarded: "09-08-2024", status: "healthy" },
  { id: "ABC-ENT-006", name: "ABC Industries Ltd.", type: "Manufacturing", sector: "Automotive", country: "India", city: "Hosur", plants: 3, assets: 962, elpremars: 8, onboarded: "27-05-2025", status: "onboarding" },
  { id: "EMR-ENT-007", name: "Emirates Steel", type: "Manufacturing", sector: "Steel & Metals", country: "United Arab Emirates", city: "Dubai", plants: 4, assets: 1488, elpremars: 12, onboarded: "14-11-2024", status: "attention" },
  { id: "SBC-ENT-008", name: "SABIC", type: "Oil & Gas", sector: "Petrochemicals", country: "Saudi Arabia", city: "Riyadh", plants: 6, assets: 2104, elpremars: 18, onboarded: "02-12-2024", status: "healthy" },
  { id: "THY-ENT-009", name: "Thyssenkrupp AG", type: "Manufacturing", sector: "Steel & Metals", country: "Germany", city: "Frankfurt", plants: 5, assets: 1776, elpremars: 15, onboarded: "19-01-2025", status: "healthy" },
  { id: "SGX-ENT-010", name: "Singapore Grid Co.", type: "Data Centre", sector: "IT / Data Centres", country: "Singapore", city: "Singapore", plants: 2, assets: 806, elpremars: 7, onboarded: "05-02-2025", status: "healthy" },
  { id: "HIN-ENT-011", name: "Hindalco Industries", type: "Manufacturing", sector: "Steel & Metals", country: "India", city: "Renukoot", plants: 7, assets: 2914, elpremars: 24, onboarded: "11-09-2024", status: "attention" },
  { id: "VED-ENT-012", name: "Vedanta Limited", type: "Power & Utilities", sector: "Power Generation", country: "India", city: "Jharsuguda", plants: 10, assets: 3640, elpremars: 31, onboarded: "28-10-2024", status: "healthy" },
  { id: "BPC-ENT-013", name: "Bharat Petroleum", type: "Oil & Gas", sector: "Petrochemicals", country: "India", city: "Kochi", plants: 6, assets: 2488, elpremars: 21, onboarded: "16-12-2024", status: "critical" },
  { id: "UTC-ENT-014", name: "UltraTech Cement", type: "Manufacturing", sector: "Cement", country: "India", city: "Ahmedabad", plants: 9, assets: 2176, elpremars: 19, onboarded: "22-01-2025", status: "healthy" },
  { id: "DRL-ENT-015", name: "Dr. Reddy's Labs", type: "Manufacturing", sector: "Pharmaceuticals", country: "India", city: "Hyderabad", plants: 4, assets: 1352, elpremars: 14, onboarded: "07-03-2025", status: "attention" },
  { id: "TAT-ENT-016", name: "Tata Steel Europe", type: "Manufacturing", sector: "Steel & Metals", country: "Netherlands", city: "IJmuiden", plants: 5, assets: 2042, elpremars: 17, onboarded: "19-09-2024", status: "attention" },
  { id: "LYB-ENT-017", name: "LyondellBasell", type: "Oil & Gas", sector: "Petrochemicals", country: "United States", city: "Houston", plants: 7, assets: 2760, elpremars: 23, onboarded: "04-11-2024", status: "healthy" },
  { id: "VAL-ENT-018", name: "Vale S.A.", type: "Manufacturing", sector: "Steel & Metals", country: "Brazil", city: "São Paulo", plants: 6, assets: 1988, elpremars: 16, onboarded: "13-02-2025", status: "critical" },
  { id: "ESK-ENT-019", name: "Eskom Holdings", type: "Power & Utilities", sector: "Power Generation", country: "South Africa", city: "Johannesburg", plants: 8, assets: 2314, elpremars: 20, onboarded: "26-03-2025", status: "healthy" },
  { id: "BHP-ENT-020", name: "BHP Group", type: "Infrastructure", sector: "Steel & Metals", country: "Australia", city: "Sydney", plants: 3, assets: 1104, elpremars: 11, onboarded: "09-06-2025", status: "onboarding" },
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
