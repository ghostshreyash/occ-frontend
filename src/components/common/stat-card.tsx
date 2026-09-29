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
        "group/stat flex items-center gap-2.5 rounded-lg px-3 py-2 shadow-xs ring-1",
        // Lift and brighten on hover; skipped entirely for reduced-motion users
        "transition-[transform,box-shadow,--tw-ring-color] duration-200 ease-out",
        "hover:shadow-md hover:ring-foreground/20 motion-safe:hover:-translate-y-0.5",
        variant === "tinted" ? t.card : "bg-card ring-foreground/8",
        className
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 ease-out",
          "motion-safe:group-hover/stat:scale-110",
          t.icon
        )}
      >
        <Icon className="size-4.5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[0.7rem] leading-tight font-medium text-muted-foreground">{label}</div>
        <div className="text-lg leading-tight font-bold text-brand-navy dark:text-foreground">
          {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        </div>
        {/* Trend reads as one line: "▲ +6% vs last month" */}
        {change !== undefined ? (
          <div className="flex items-center gap-1 text-[0.7rem] leading-tight whitespace-nowrap">
            <Triangle className="size-2 shrink-0 fill-current text-healthy" />
            <span className="font-semibold text-healthy">+{change}%</span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        ) : null}
        {percent !== undefined ? <div className={cn("text-xs leading-tight font-bold", t.accent)}>{percent}%</div> : null}
        {footer}
      </div>
    </div>
  )
}
