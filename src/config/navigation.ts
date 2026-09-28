import {
  BarChart3,
  Building2,
  Factory,
  FileText,
  Globe,
  HardHat,
  House,
  LifeBuoy,
  MessageCircle,
  Network,
  TabletSmartphone,
  TriangleAlert,
  UserRoundCog,
  Wrench,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  path: string
  icon: LucideIcon
  badge?: number
}

/** OCC sidebar, in the order shown in the mockups */
export const occNavigation: NavItem[] = [
  { title: "OCC Global Dashboard", path: "/", icon: House },
  { title: "India/Global Customer Map", path: "/customer-map", icon: Globe },
  { title: "Enterprise Onboarding", path: "/enterprise-onboarding", icon: Building2 },
  { title: "Enterprise Status", path: "/enterprise-status", icon: Building2 },
  { title: "Plant Status", path: "/plant-status", icon: Factory },
  { title: "Critical Alerts", path: "/critical-alerts", icon: TriangleAlert, badge: 5 },
  { title: "Escalation Centre", path: "/escalation-centre", icon: UserRoundCog },
  { title: "EMMSE Connectivity", path: "/emmse-connectivity", icon: Network },
  { title: "EVITA Activity", path: "/evita-activity", icon: TabletSmartphone },
  { title: "ELPREMAR Activity & Availability", path: "/elpremars", icon: HardHat },
  { title: "Maintenance Progress", path: "/maintenance-progress", icon: Wrench },
  { title: "24×7 Helpdesk/Chatbot", path: "/helpdesk", icon: MessageCircle },
  { title: "Support Tickets", path: "/support-tickets", icon: LifeBuoy },
  { title: "Enterprise Reliability Trends", path: "/reliability-trends", icon: BarChart3 },
  { title: "MIS / Reporting", path: "/mis-reporting", icon: FileText },
]
