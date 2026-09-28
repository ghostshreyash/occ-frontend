import type { ChartConfig } from "@/components/ui/chart"

/**
 * Single source of truth for status colours. Screens should use these maps
 * instead of choosing colours themselves, so a Healthy asset looks the same
 * in a badge, a donut chart, a map marker and a KPI tile.
 * The colours themselves live as CSS variables in src/index.css.
 */

/** Asset / enterprise / plant health (URS 10.15: GREEN, ORANGE, RED) */
export type HealthStatus = "healthy" | "attention" | "critical" | "offline"

export const healthStatus: Record<
  HealthStatus,
  { label: string; color: string; badge: HealthStatus; dot: string; tile: string }
> = {
  healthy: {
    label: "Healthy",
    color: "var(--success)",
    badge: "healthy",
    dot: "bg-healthy",
    tile: "bg-healthy-soft text-healthy-soft-foreground",
  },
  attention: {
    label: "Attention",
    color: "var(--warning)",
    badge: "attention",
    dot: "bg-attention",
    tile: "bg-attention-soft text-attention-soft-foreground",
  },
  critical: {
    label: "Critical",
    color: "var(--destructive)",
    badge: "critical",
    dot: "bg-critical",
    tile: "bg-critical-soft text-critical-soft-foreground",
  },
  offline: {
    label: "Offline",
    color: "var(--neutral)",
    badge: "offline",
    dot: "bg-offline",
    tile: "bg-offline-soft text-offline-soft-foreground",
  },
}

/** Ready-made Recharts config for health donuts and trend lines */
export const healthChartConfig = {
  healthy: { label: "Healthy", color: "var(--success)" },
  attention: { label: "Attention", color: "var(--warning)" },
  critical: { label: "Critical", color: "var(--destructive)" },
  offline: { label: "Offline", color: "var(--neutral)" },
} satisfies ChartConfig

/** Alert severity (Critical Alerts table) */
export type AlertSeverity = "critical" | "warning" | "info"

export const alertSeverity: Record<AlertSeverity, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-critical text-critical-foreground" },
  warning: { label: "Warning", className: "bg-attention text-attention-foreground" },
  info: { label: "Info", className: "bg-info text-info-foreground" },
}

/** Workflow status (alerts, tickets, tasks, maintenance) */
export type WorkStatus =
  | "open"
  | "in_progress"
  | "pending"
  | "assigned"
  | "completed"
  | "closed"

export const workStatus: Record<
  WorkStatus,
  { label: string; badge: "critical" | "info" | "warning" | "success" | "neutral" }
> = {
  open: { label: "Open", badge: "critical" },
  in_progress: { label: "In Progress", badge: "info" },
  pending: { label: "Pending", badge: "warning" },
  assigned: { label: "Assigned", badge: "info" },
  completed: { label: "Completed", badge: "success" },
  closed: { label: "Closed", badge: "neutral" },
}

/** Categorical series colours, in order, for charts with arbitrary groups */
export const chartSeries = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const
