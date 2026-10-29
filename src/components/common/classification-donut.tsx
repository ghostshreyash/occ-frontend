import { Cell, Pie, PieChart } from "recharts"
import { cn } from "cn"

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { useCountUp } from "@/hooks/use-count-up"
import { useInView } from "@/hooks/use-in-view"
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion"
import { drill, type Classification, type DrillSlice, type Section } from "@/data/enterprise-classification"
import type { SectorType } from "@/data/master-data"

/** Matches the other donuts, so every chart on the row sweeps at the same pace. */
const SWEEP_DURATION = 900

/** What the Sectors filter is showing: both sections, or one drilled into. */
export type SectorView = "all" | SectorType

/** Kept outside the chart: a parent that re-renders every frame would otherwise
 *  restart the sweep every frame and the ring would never visibly move. */
function CenterTotal({ total, centerLabel, counting }: { total: number; centerLabel: string; counting: boolean }) {
  const value = useCountUp(counting ? total : 0, SWEEP_DURATION)
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-lg leading-tight font-bold tabular-nums">{value.toLocaleString("en-IN")}</span>
      <span className="text-[0.62rem] leading-tight text-muted-foreground">{centerLabel}</span>
    </div>
  )
}

const pct = (n: number) => `${Math.round(n)}%`

/** Shell both tooltips share, so the drill-down and the overview read alike. */
function TooltipCard({
  color,
  title,
  value,
  children,
}: {
  color: string
  title: string
  value: number
  children: React.ReactNode
}) {
  return (
    <div className="grid min-w-48 gap-1 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-1.5 font-medium">
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
        {title}
        <span className="ml-auto font-semibold tabular-nums">{value.toLocaleString("en-IN")}</span>
      </div>
      {children}
    </div>
  )
}

/** Overview: one slice per section, listing the sectors inside it. */
function SectionTooltip({ active, payload }: { active?: boolean; payload?: { payload: unknown }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as Section

  return (
    <TooltipCard color={d.color} title={d.label} value={d.value}>
      <div className="border-t pt-1 text-[0.68rem] text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground">{pct(d.shareOfTotal)}</span> of all enterprises
      </div>
      <p className="text-[0.62rem] text-muted-foreground">
        {d.sectors.length} sectors — pick {d.key} above to break it down
      </p>
    </TooltipCard>
  )
}

/** Drill-down: the ring is one section, so the share shown is of that section. */
function DrillTooltip({
  active,
  payload,
  sectionLabel,
}: {
  active?: boolean
  payload?: { payload: unknown }[]
  sectionLabel: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as DrillSlice

  return (
    <TooltipCard color={d.color} title={d.label} value={d.value}>
      <div className="border-t pt-1 text-[0.68rem] text-muted-foreground">
        <span className="font-medium tabular-nums text-foreground">{pct(d.shareOfSection)}</span> of {sectionLabel}
      </div>
      {d.rolledUp ? <p className="text-[0.62rem] text-muted-foreground">{d.rolledUp.join(", ")}</p> : null}
    </TooltipCard>
  )
}

/** Sectors filter. Three states, so a segmented control rather than a dropdown. */
export function SectorViewFilter({ value, onChange }: { value: SectorView; onChange: (v: SectorView) => void }) {
  const options: { value: SectorView; label: string }[] = [
    { value: "all", label: "All" },
    { value: "Industry", label: "Industry" },
    { value: "Retail", label: "Retail" },
  ]
  return (
    <div role="group" aria-label="Sectors" className="inline-flex rounded-md bg-muted p-0.5 text-[0.65rem]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded px-2 py-0.5 font-medium transition-colors",
            o.value === value ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Enterprise classification.
 *
 * "All" rings the two sections; picking one rings that section's own sectors,
 * which sum to it. Colour never carries more than eight categories, which is
 * where a categorical palette stops being separable — past that the smallest
 * sectors fold into one "Other" slice rather than becoming slivers nobody can
 * tell apart. The list beside the ring is the legend, and it also supplies the
 * visible labels the palette's contrast relief depends on.
 */
export function ClassificationDonut({
  data,
  centerLabel,
  view = "all",
  size = 122,
}: {
  data: Classification
  centerLabel: string
  view?: SectorView
  size?: number
}) {
  const reduced = usePrefersReducedMotion()
  const { ref, inView } = useInView<HTMLDivElement>()

  const drilled = view === "all" ? undefined : drill(data, view)

  // "All" is the two sections; a drill-down is that section's own sectors
  const slices = drilled
    ? drilled.slices.map((s) => ({ key: s.key, label: s.label, color: s.color, value: s.value, payload: s as object }))
    : data.sections.map((s) => ({ key: s.key, label: s.label, color: s.color, value: s.value, payload: s as object }))

  const total = drilled ? drilled.section.value : data.total
  const label = drilled ? drilled.section.label : centerLabel

  const config = Object.fromEntries(slices.map((d) => [d.key, { label: d.label, color: d.color }])) satisfies ChartConfig

  // Remounting is what replays the sweep; Recharts only animates from zero on mount
  const dataKey = `${view}|${slices.map((d) => `${d.key}:${d.value}`).join("|")}`

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-3">
      <div className="relative shrink-0" style={{ width: size }}>
        {/* Above the centre total, so a tooltip crossing the hole covers it rather
            than having the figure show through */}
        <ChartContainer config={config} className="relative z-10 aspect-square w-full">
          <PieChart key={inView ? `in-view:${dataKey}` : "waiting"}>
            <ChartTooltip content={drilled ? <DrillTooltip sectionLabel={drilled.section.label} /> : <SectionTooltip />} />
            <Pie
              data={slices.map((d) => d.payload)}
              dataKey="value"
              nameKey="key"
              innerRadius="62%"
              outerRadius="100%"
              strokeWidth={2}
              stroke="var(--card)"
              isAnimationActive={inView && !reduced}
              animationBegin={0}
              animationDuration={SWEEP_DURATION}
              animationEasing="ease-out"
            >
              {slices.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <CenterTotal key={dataKey} total={total} centerLabel={label} counting={inView} />
      </div>

      {drilled ? (
        /* One row per sector — the legend, and the readable detail */
        <ul className="max-h-[8.5rem] min-w-40 flex-1 space-y-1 overflow-y-auto pr-1 text-[0.68rem]">
          {drilled.slices.map((s) => (
            <li key={s.key} className="flex items-baseline gap-1.5">
              <span className="size-2 shrink-0 translate-y-px rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate" title={s.rolledUp?.join(", ") ?? s.label}>
                {s.label}
              </span>
              <span className="shrink-0 tabular-nums">{s.value}</span>
              <span className="w-8 shrink-0 text-right font-medium tabular-nums text-muted-foreground">
                {pct(s.shareOfSection)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        /* Just the two sections and their share of the portfolio */
        <ul className="min-w-40 flex-1 space-y-2 text-xs">
          {data.sections.map((section) => (
            <li key={section.key} className="space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="size-2 shrink-0 translate-y-px rounded-full" style={{ background: section.color }} />
                <span className="min-w-0 flex-1 truncate font-medium">{section.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">{pct(section.shareOfTotal)}</span>
              </div>
              {/* The bar repeats the share positionally, so the two are comparable at a glance */}
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${section.shareOfTotal}%`, background: section.color }} />
              </div>
              <div className="text-[0.65rem] tabular-nums text-muted-foreground">
                {section.value.toLocaleString("en-IN")} enterprises
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
