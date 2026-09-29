/**
 * Operational tables and regional slices for the OCC screens.
 * Kept separate from mock.ts so the dashboard/map data stays readable.
 * Replace with API calls (TanStack Query) later.
 */
import type { HealthStatus, WorkStatus } from "@/lib/status"
import { priorities } from "@/data/mock"

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
  elpremar: string
  scheduled: string
  progress: number
  status: WorkStatus
}

export const maintenanceProgress: MaintenanceRow[] = [
  { id: "MT-2291", asset: "LT Panel - Block A", plant: "Mumbai Works", enterprise: "Tata Steel", country: "India", type: "Preventive", elpremar: "Suresh Kumar", scheduled: "28-05-2025", progress: 100, status: "completed" },
  { id: "MT-2290", asset: "Transformer - T1", plant: "Jamnagar", enterprise: "Reliance Industries", country: "India", type: "Condition Based", elpremar: "Amit Sharma", scheduled: "28-05-2025", progress: 65, status: "in_progress" },
  { id: "MT-2289", asset: "MCC - Unit 2", plant: "Dolvi", enterprise: "JSW Group", country: "India", type: "Corrective", elpremar: "Ramesh Patil", scheduled: "29-05-2025", progress: 30, status: "in_progress" },
  { id: "MT-2288", asset: "PCC - Main", plant: "Mundra", enterprise: "Adani Group", country: "India", type: "Emergency", elpremar: "Anil Singh", scheduled: "27-05-2025", progress: 0, status: "open" },
  { id: "MT-2287", asset: "HT Panel - Incomer 1", plant: "Hyderabad", enterprise: "NTPC", country: "India", type: "Preventive", elpremar: "Suresh Kumar", scheduled: "30-05-2025", progress: 0, status: "assigned" },
  { id: "MT-2286", asset: "APFC Panel - 1", plant: "Dubai", enterprise: "NTPC", country: "UAE", type: "Preventive", elpremar: "Khalid Rahman", scheduled: "29-05-2025", progress: 45, status: "in_progress" },
  { id: "MT-2285", asset: "UPS - 03", plant: "Frankfurt", enterprise: "Tata Steel", country: "Germany", type: "Corrective", elpremar: "Lukas Weber", scheduled: "30-05-2025", progress: 0, status: "assigned" },
  { id: "MT-2284", asset: "Switchboard - SB2", plant: "Houston", enterprise: "Reliance Industries", country: "USA", type: "Condition Based", elpremar: "Maria Lopez", scheduled: "31-05-2025", progress: 80, status: "in_progress" },
]

/* ---------- Tasks ---------- */

export type TaskRow = {
  id: string
  elpremar: string
  enterprise: string
  plant: string
  country: string
  activity: string
  due: string
  priority: Priority
  status: WorkStatus
}

export const taskQueue: TaskRow[] = [
  { id: "TSK-8841", elpremar: "Suresh Kumar", enterprise: "Tata Steel", plant: "Mumbai Works", country: "India", activity: "Thermal Scan", due: "28-05-2025", priority: "High", status: "in_progress" },
  { id: "TSK-8840", elpremar: "Amit Sharma", enterprise: "Reliance Industries", plant: "Jamnagar", country: "India", activity: "Partial Discharge Testing", due: "28-05-2025", priority: "Critical", status: "assigned" },
  { id: "TSK-8839", elpremar: "Ramesh Patil", enterprise: "JSW Group", plant: "Dolvi", country: "India", activity: "Panel Cleaning (INSTA CLEAN)", due: "29-05-2025", priority: "Medium", status: "assigned" },
  { id: "TSK-8838", elpremar: "Anil Singh", enterprise: "Adani Group", plant: "Mundra", country: "India", activity: "Visual Inspection", due: "27-05-2025", priority: "Low", status: "completed" },
  { id: "TSK-8837", elpremar: "Suresh Kumar", enterprise: "NTPC", plant: "Hyderabad", country: "India", activity: "Insulation Resistance Testing", due: "30-05-2025", priority: "Medium", status: "pending" },
  { id: "TSK-8836", elpremar: "Khalid Rahman", enterprise: "NTPC", plant: "Dubai", country: "UAE", activity: "Preventive Assessment", due: "29-05-2025", priority: "High", status: "assigned" },
  { id: "TSK-8835", elpremar: "Lukas Weber", enterprise: "Tata Steel", plant: "Frankfurt", country: "Germany", activity: "Fire Prevention System Check", due: "31-05-2025", priority: "Medium", status: "pending" },
  { id: "TSK-8834", elpremar: "Maria Lopez", enterprise: "Reliance Industries", plant: "Houston", country: "USA", activity: "Thermal Scan", due: "01-06-2025", priority: "Low", status: "assigned" },
]

/* ---------- Support tickets ---------- */

export type TicketRow = {
  id: string
  enterprise: string
  plant: string
  country: string
  subject: string
  raised: string
  priority: Priority
  status: WorkStatus
}

export const supportTickets: TicketRow[] = [
  { id: "TK-4592", enterprise: "Tata Steel", plant: "Jamshedpur", country: "India", subject: "EVITA sync failing on tablet", raised: "27-05-2025", priority: "High", status: "open" },
  { id: "TK-4591", enterprise: "JSW Group", plant: "Dolvi", country: "India", subject: "Request ELPREMAR assignment", raised: "27-05-2025", priority: "Medium", status: "in_progress" },
  { id: "TK-4590", enterprise: "Reliance Industries", plant: "Jamnagar", country: "India", subject: "PD meter not pairing over Bluetooth", raised: "26-05-2025", priority: "Critical", status: "in_progress" },
  { id: "TK-4589", enterprise: "Adani Group", plant: "Mundra", country: "India", subject: "Health report PDF not downloading", raised: "26-05-2025", priority: "Low", status: "closed" },
  { id: "TK-4588", enterprise: "NTPC", plant: "Kolkata", country: "India", subject: "Add new sub-division to hierarchy", raised: "25-05-2025", priority: "Medium", status: "closed" },
  { id: "TK-4587", enterprise: "NTPC", plant: "Dubai", country: "UAE", subject: "EMMSE dashboard loading slowly", raised: "25-05-2025", priority: "Medium", status: "closed" },
  { id: "TK-4586", enterprise: "Tata Steel", plant: "IJmuiden", country: "Netherlands", subject: "Asset QR code not scanning", raised: "24-05-2025", priority: "High", status: "open" },
  { id: "TK-4585", enterprise: "JSW Group", plant: "Sydney", country: "Australia", subject: "User access request for plant head", raised: "24-05-2025", priority: "Low", status: "closed" },
]

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
   * "In Onboarding" gets no trend at all - it is a live queue, not a trend.
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
