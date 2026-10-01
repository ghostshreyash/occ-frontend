import {
  Building2,
  FileText,
  HardHat,
  House,
  LifeBuoy,
  Wrench,
  type LucideIcon,
} from "lucide-react"

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
  { title: "Support Tickets", path: "/support-tickets", icon: LifeBuoy },
]
