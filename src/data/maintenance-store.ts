import { useSyncExternalStore } from "react"

import { maintenanceDetail, type MaintenanceDetail } from "@/data/maintenance-detail"
import { maintenanceActivities, type MaintenanceRow } from "@/data/occ-tables"
import type { WorkStatus } from "@/lib/status"

/**
 * One copy of the maintenance book plus the execution record behind each row,
 * shared by the list and the details screen so approving, rejecting or
 * reassigning in either place shows up in the other. Stands in for the query
 * cache until these rows come from the API.
 */
let rows: MaintenanceRow[] = maintenanceActivities
let details: Record<string, MaintenanceDetail> = Object.fromEntries(
  rows.map((r) => [r.id, maintenanceDetail(r)])
)

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

export const useMaintenanceRows = () => useSyncExternalStore(subscribe, () => rows)

export const useMaintenanceDetails = () => useSyncExternalStore(subscribe, () => details)

export const findMaintenance = (id?: string) => (id ? rows.find((r) => r.id === id) : undefined)

export function updateMaintenance(id: string, patch: Partial<MaintenanceRow>) {
  rows = rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
  emit()
}

/**
 * Raise a maintenance activity off the back of an inspection, carrying the
 * enterprise, plant and asset across so OCC never re-keys them. Returns the new
 * task id so the caller can navigate straight to it.
 */
export function addMaintenanceFromInspection(source: {
  inspectionId: string
  activity: string
  enterprise: string
  plant: string
  country: string
  asset: string
  elpremar: string
  scheduled: string
  slot: number
  recommendation: string
}) {
  const id = `MT-${2300 + rows.filter((r) => r.id.startsWith("MT-23")).length}`
  const row: MaintenanceRow = {
    id,
    asset: source.asset,
    plant: source.plant,
    enterprise: source.enterprise,
    country: source.country,
    type: "Condition-Based",
    elpremar: source.elpremar,
    scheduled: source.scheduled,
    slot: source.slot,
    status: "open",
    inspectionId: source.inspectionId,
  }
  rows = [row, ...rows]
  details = {
    ...details,
    [id]: {
      ...maintenanceDetail(row),
      description: `Raised from inspection ${source.inspectionId} (${source.activity}). ${source.recommendation}`,
      createdBy: "Admin (OCC)",
      execution: undefined,
      products: [],
      evidence: [],
      review: undefined,
    },
  }
  listeners.forEach((listener) => listener())
  return id
}

/** Sign an activity off, or send it back to the field for correction */
export function reviewMaintenance(id: string, outcome: "approved" | "rejected", by: string, remarks: string) {
  const status: WorkStatus = outcome === "approved" ? "assigned" : "rejected"
  const at = new Date()
  const stamp = `${String(at.getDate()).padStart(2, "0")}-${String(at.getMonth() + 1).padStart(2, "0")}-${at.getFullYear()} ${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`

  rows = rows.map((r) => (r.id === id ? { ...r, status } : r))
  details = { ...details, [id]: { ...details[id], review: { outcome, by, at: stamp, remarks } } }
  emit()
}
