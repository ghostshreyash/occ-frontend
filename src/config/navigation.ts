import {
  Building2,
  ClipboardList,
  FileText,
  HardDrive,
  HardHat,
  House,
  LayoutDashboard,
  LifeBuoy,
  SquareCheckBig,
  Wrench,
  type LucideIcon,
} from "lucide-react"

import type { BrandKey } from "@/config/brands"

export type NavItem = {
  title: string
  path: string
  icon: LucideIcon
  badge?: number
  /**
   * Other route prefixes that belong to this section, so a details screen keeps
   * its sidebar entry highlighted even though it sits on its own path.
   */
  covers?: string[]
}

/** OCC sidebar, in the order shown in the mockups */
export const occNavigation: NavItem[] = [
  { title: "Dashboard", path: "/", icon: House },
  { title: "Enterprises", path: "/enterprises", icon: Building2 },
  { title: "ELPREMARs", path: "/elpremars", icon: HardHat },
  { title: "Maintenance Activities", path: "/maintenance-activities", icon: Wrench, covers: ["/maintenance-activity-details"] },
  { title: "Inspection Activities", path: "/inspection-activities", icon: FileText, covers: ["/inspection-activity-details"] },
  { title: "Support Tickets", path: "/support-tickets", icon: LifeBuoy, covers: ["/support-ticket-details"] },
]

/**
 * EVITA sidebar — the field engineer's app, not the command centre.
 *
 * A different set of sections entirely: an ELPREMAR works their own tasks and
 * the assets in front of them, and never sees enterprises, the ELPREMAR register
 * or the OCC support desk.
 *
 * Every path sits under `/evita` because the two apps share no screens at all —
 * not even the dashboard. One deployment serves both, so separate paths are what
 * keeps a field engineer out of the command centre's screens and vice versa.
 */
export const evitaNavigation: NavItem[] = [
  { title: "Dashboard", path: "/evita", icon: LayoutDashboard },
  { title: "Assets", path: "/evita/assets", icon: HardDrive },
  { title: "My Tasks", path: "/evita/my-tasks", icon: ClipboardList },
  { title: "Testing & Measurements", path: "/evita/testing-measurements", icon: SquareCheckBig },
  { title: "Maintenance Activities", path: "/evita/maintenance-activities", icon: Wrench },
  { title: "Reports", path: "/evita/reports", icon: FileText },
]

/** Where a brand's sign-in lands, and where its own "home" is */
export const homeFor = (brand: BrandKey) => (brand === "evita" ? "/evita" : "/")

/**
 * The sidebar for a brand. EMMSE has no set of its own yet, so it falls back to
 * the command centre's until its screens exist.
 */
export const navigationFor = (brand: BrandKey): NavItem[] =>
  brand === "evita" ? evitaNavigation : occNavigation

/** Every section any brand can reach — what the router builds placeholders from */
export const allNavigation: NavItem[] = [
  ...occNavigation,
  ...evitaNavigation.filter((e) => !occNavigation.some((o) => o.path === e.path)),
]
