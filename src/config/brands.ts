import {
  Activity,
  Building2,
  BarChart3,
  Bell,
  ClipboardCheck,
  Gauge,
  Globe2,
  Leaf,
  Settings,
  ShieldCheck,
  TabletSmartphone,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react"

/**
 * The three ways into the OLIVINE platform.
 *
 * They are one application seen by different roles, and each is served on its
 * own hostname — olivine.* for the Command Centre, emmse.* for enterprise
 * administrators, evita.* for ELPREMARs in the field. There is no chooser
 * screen for signed-out users: the host decides which sign-in the visitor sees
 * (`src/lib/brand.ts`), and everything that differs between them is data in this
 * file. The same data drives the `/welcome` overview of the platform.
 */
export type BrandKey = "occ" | "emmse" | "evita"

export type Brand = {
  key: BrandKey
  /** Sub-domain labels that resolve to this brand. */
  hosts: string[]
  /**
   * Where this brand is deployed, used by the `/welcome` overview to link out.
   * TODO: fill in once the production hostnames are confirmed; until then the
   * overview links to this deployment with a `?brand=` preview.
   */
  origin?: string
  /** Shown on the overview card. */
  icon: LucideIcon
  audience: string
  summary: string
  /** Wordmark, split so the accent half can be coloured. */
  wordmark: { lead: string; accent?: string }
  /** Expansion of the wordmark. */
  system: string
  tagline: string
  /** Line above the wordmark. */
  eyebrow: string
  /** What this role does, shown beside the form. */
  features: { icon: LucideIcon; label: string; detail: string }[]
  /** Short promises along the foot of the screen. */
  promises: { icon: LucideIcon; label: string }[]
  /** Photograph behind the story panel; OCC uses a live console motif instead. */
  visual: { kind: "photo"; src: string } | { kind: "console" }
  login: {
    heading: string
    description: string
    identifierLabel: string
    identifierPlaceholder: string
    identifierType: "text" | "email"
    identifierIcon: "mail" | "user"
    submitLabel: string
    /** Access warning under the form. */
    notice?: { title: string; body: string }
    /** Closing line with a link. */
    footnote?: { title: string; body: string; linkLabel: string; to: string }
  }
}

export const brands: Record<BrandKey, Brand> = {
  occ: {
    key: "occ",
    hosts: ["olivine", "occ", "localhost"],
    icon: Gauge,
    audience: "OLIVINE operations teams",
    summary:
      "Real-time visibility of every enterprise, plant and asset, with alerts, escalations and onboarding in one console.",
    wordmark: { lead: "Command", accent: " Centre" },
    system: "Tier III operations console for the OLIVINE reliability platform",
    tagline: "Real-time visibility. Faster response. Higher reliability.",
    eyebrow: "Olivine Global Systems",
    features: [
      { icon: Globe2, label: "Global asset health", detail: "Every enterprise, plant and asset on one map" },
      { icon: Bell, label: "Critical alerts", detail: "Escalations routed the moment they open" },
      { icon: Activity, label: "Live reliability", detail: "Trends, uptime and MIS in one console" },
    ],
    promises: [
      { icon: ShieldCheck, label: "Secure by design" },
      { icon: Activity, label: "24×7 monitoring" },
      { icon: Leaf, label: "Reliable Today. Sustainable Tomorrow." },
    ],
    visual: { kind: "console" },
    login: {
      heading: "Welcome back",
      description: "Sign in to the Olivine Command Centre.",
      identifierLabel: "E-mail address",
      identifierPlaceholder: "you@olivineglobalsystems.com",
      identifierType: "email",
      identifierIcon: "mail",
      submitLabel: "Log in",
      footnote: {
        title: "Need an account?",
        body: "Command Centre access is granted by an OLIVINE administrator.",
        linkLabel: "Request access",
        to: "/register",
      },
    },
  },

  emmse: {
    key: "emmse",
    hosts: ["emmse"],
    icon: Building2,
    audience: "Enterprise administrators",
    summary:
      "The enterprise's own portal for managing assets, maintenance activities, reports and fire prevention compliance.",
    wordmark: { lead: "EMMS", accent: "-E" },
    system: "Electrical Maintenance Management System — Enterprise Edition",
    tagline: "Smart Maintenance. Reliable Assets. Sustainable Tomorrow.",
    eyebrow: "For enterprise administrators",
    features: [
      { icon: Gauge, label: "Improve asset reliability", detail: "Health, inspections and history per asset" },
      { icon: TrendingUp, label: "Optimize maintenance cost", detail: "Plan the work that actually prevents failure" },
      { icon: ShieldCheck, label: "Safety & compliance", detail: "Fire prevention and statutory records in order" },
    ],
    promises: [
      { icon: TrendingUp, label: "Higher asset uptime" },
      { icon: Settings, label: "Operational excellence" },
      { icon: Leaf, label: "Cleaner operations" },
      { icon: ShieldCheck, label: "Safer workplaces" },
    ],
    visual: { kind: "photo", src: "/brand/emmse-login.jpg" },
    login: {
      heading: "Enterprise login",
      description: "Access EMMS-E to manage, maintain and ensure the reliability of your electrical assets.",
      identifierLabel: "Enterprise ID / Registered e-mail",
      identifierPlaceholder: "Enter your Enterprise ID or e-mail",
      identifierType: "text",
      identifierIcon: "mail",
      submitLabel: "Login to EMMS-E",
      footnote: {
        title: "New enterprise?",
        body: "Contact Olivine Global Systems to onboard your enterprise.",
        linkLabel: "Request access",
        to: "/register",
      },
    },
  },

  evita: {
    key: "evita",
    hosts: ["evita"],
    icon: TabletSmartphone,
    audience: "ELPREMAR field engineers",
    summary:
      "The on-site companion for inspections, testing and measurements, asset onboarding and QR-coded asset records.",
    wordmark: { lead: "EVITA" },
    system: "Enterprise Electrical Maintenance & Reliability Management System",
    tagline: "Field Insights. Reliable Assets.",
    eyebrow: "For ELPREMAR field engineers",
    features: [
      { icon: ClipboardCheck, label: "Inspect", detail: "Assigned activities, QR-coded assets, offline ready" },
      { icon: Wrench, label: "Maintain", detail: "Testing, measurements and findings from the floor" },
      { icon: BarChart3, label: "Ensure reliability", detail: "Every reading feeds the enterprise's health" },
      { icon: Leaf, label: "Enable a greener future", detail: "Safer work and more sustainable operations" },
    ],
    promises: [
      { icon: ShieldCheck, label: "Work safely" },
      { icon: Wrench, label: "Keep assets reliable" },
      { icon: Leaf, label: "Support a greener tomorrow" },
    ],
    visual: { kind: "photo", src: "/brand/evita-login.jpg" },
    login: {
      heading: "Welcome Back",
      description: "Login to access your assigned activities",
      identifierLabel: "Username",
      identifierPlaceholder: "firstname.lastname",
      identifierType: "text",
      identifierIcon: "user",
      submitLabel: "Login",
      notice: {
        title: "This device is for authorized ELPREMAR personnel only.",
        body: "Unauthorised access is prohibited.",
      },
    },
  },
}

export const brandList = Object.values(brands)
