import { Triangle, type LucideIcon } from "lucide-react"
import { cn } from "cn"

export type StatTone = "info" | "success" | "highlight" | "healthy" | "attention" | "critical" | "neutral"

/* Card tint, icon circle and accent text per tone (all from theme tokens) */
const toneClasses: Record<StatTone, { card: string; icon: string; accent: string }> = {
  info: { card: "bg-info-soft/70 ring-info/10", icon: "bg-info/12 text-info", accent: "text-info" },
  success: { card: "bg-success-soft/70 ring-success/10", icon: "bg-success/12 text-success", accent: "text-success" },
  highlight: { card: "bg-highlight-soft/70 ring-highlight/10", icon: "bg-highlight/12 text-highlight", accent: "text-highlight" },
  healthy: { card: "bg-healthy-soft ring-healthy/10", icon: "bg-healthy/15 text-healthy", accent: "text-healthy-soft-foreground" },
  attention: { card: "bg-attention-soft ring-attention/15", icon: "bg-attention/15 text-attention", accent: "text-attention-soft-foreground" },
  critical: { card: "bg-critical-soft ring-critical/10", icon: "bg-critical/12 text-critical", accent: "text-critical-soft-foreground" },
  neutral: { card: "bg-neutral-soft ring-neutral/10", icon: "bg-neutral/15 text-neutral-soft-foreground", accent: "text-neutral-soft-foreground" },
}

/**
 * KPI tile from the OCC mockups: round soft icon, label, big number, and either
 * a "▲ +6% / vs last month" trend or a coloured percentage.
 * `variant="tinted"` = dashboard style, `variant="plain"` = white card (customer map page).
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  change,
  percent,
  footer,
  variant = "tinted",
  className,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  tone: StatTone
  change?: number
  percent?: number
  footer?: React.ReactNode
  variant?: "tinted" | "plain"
  className?: string
}) {
  const t = toneClasses[tone]
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl px-4 py-3.5 shadow-xs ring-1",
        variant === "tinted" ? t.card : "bg-card ring-foreground/8",
        className
      )}
    >
      <div className={cn("flex size-14 shrink-0 items-center justify-center rounded-full", t.icon)}>
        <Icon className="size-7" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="text-sm leading-tight font-medium text-foreground">{label}</div>
        <div className="mt-0.5 text-[1.7rem] leading-tight font-bold text-brand-navy dark:text-foreground">
          {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        </div>
        {change !== undefined ? (
          <div className="mt-0.5 text-sm leading-tight">
            <div className="flex items-center gap-1 font-semibold text-healthy">
              <Triangle className="size-3 fill-current" /> +{change}%
            </div>
            <div className="text-muted-foreground">vs last month</div>
          </div>
        ) : null}
        {percent !== undefined ? <div className={cn("text-lg leading-tight font-bold", t.accent)}>{percent}%</div> : null}
        {footer}
      </div>
    </div>
  )
}
