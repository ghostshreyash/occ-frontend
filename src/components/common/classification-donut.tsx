import { Cell, Pie, PieChart } from "recharts"

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { useCountUp } from "@/hooks/use-count-up"
import { useInView } from "@/hooks/use-in-view"
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion"
import type { Classification, SectorSlice } from "@/data/enterprise-classification"

/** Matches the other donuts, so every chart on the row sweeps at the same pace. */
const SWEEP_DURATION = 900

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

/**
 * Hovering a slice names the sector, which section it belongs to, and both of
 * its shares — of its own section, and of the whole portfolio.
 */
function SectorTooltip({ active, payload }: { active?: boolean; payload?: { payload: unknown }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as SectorSlice

  return (
    <div className="grid min-w-48 gap-1 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-1.5 font-medium">
        <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />
        {d.sector}
        <span className="ml-auto font-semibold tabular-nums">{d.value.toLocaleString("en-IN")}</span>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-px border-t pt-1 text-[0.68rem] text-muted-foreground">
        <dt>Share of {d.sectionLabel}</dt>
        <dd className="text-right font-medium tabular-nums text-foreground">{pct(d.shareOfSection)}</dd>
        <dt>Share of all enterprises</dt>
        <dd className="text-right font-medium tabular-nums text-foreground">{pct(d.shareOfTotal)}</dd>
      </dl>
    </div>
  )
}

/**
 * Enterprise classification: the ring carries every sector, the list beside it
 * carries the two sections.
 *
 * Sectors stay grouped on the ring because they are drawn in section order and
 * shaded from their section's hue, so Industry reads as one run of blues and
 * Retail as one run of purples. The two totals are only in the list, and a
 * slice names its own sector on hover.
 */
export function ClassificationDonut({
  data,
  centerLabel,
  size = 122,
}: {
  data: Classification
  centerLabel: string
  size?: number
}) {
  const reduced = usePrefersReducedMotion()
  const { ref, inView } = useInView<HTMLDivElement>()

  // Section order is kept, so each section's sectors stay one contiguous arc
  const slices = data.sections.flatMap((section) => section.sectors)

  const config = Object.fromEntries(
    slices.map((d) => [d.key, { label: d.sector, color: d.color }])
  ) satisfies ChartConfig

  // Remounting is what replays the sweep; Recharts only animates from zero on mount
  const dataKey = slices.map((d) => `${d.key}:${d.value}`).join("|")

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-3">
      <div className="relative shrink-0" style={{ width: size }}>
        {/* Above the centre total, so a tooltip crossing the hole covers it rather
            than having the figure show through */}
        <ChartContainer config={config} className="relative z-10 aspect-square w-full">
          <PieChart key={inView ? `in-view:${dataKey}` : "waiting"}>
            <ChartTooltip content={<SectorTooltip />} />
            <Pie
              data={slices}
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
        <CenterTotal key={dataKey} total={data.total} centerLabel={centerLabel} counting={inView} />
      </div>

      {/* Just the two sections and their share of the portfolio. The sectors
          inside them are in the tooltip, not here. */}
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
            <div className="text-[0.65rem] text-muted-foreground tabular-nums">
              {section.value.toLocaleString("en-IN")} enterprises
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
