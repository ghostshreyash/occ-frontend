import { Cell, Pie, PieChart } from "recharts"

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { useCountUp } from "@/hooks/use-count-up"
import { useInView } from "@/hooks/use-in-view"
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion"
import type { Classification, SectorGroup } from "@/data/enterprise-classification"

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

/** Hover detail for a sector: how many enterprises it holds and its share */
function SectorTooltip({ active, payload }: { active?: boolean; payload?: { payload: unknown }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as SectorGroup

  return (
    <div className="grid min-w-40 gap-1 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-1.5 font-medium">
        <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />
        {d.sector}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">Enterprises</span>
        <span className="font-semibold tabular-nums">{d.value.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">Share of total</span>
        <span className="tabular-nums">{pct(d.shareOfTotal)}</span>
      </div>
    </div>
  )
}

/**
 * Enterprise classification as a single ring of sectors, with the scale
 * breakdown carried in the legend rather than a second ring — two rings made the
 * card busier than the figures warrant.
 *
 * Same ring geometry, sweep and card metrics as `DonutChart`; only the grouped
 * legend differs.
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

  const config = Object.fromEntries(
    data.sectors.map((d) => [d.key, { label: d.sector, color: d.color }])
  ) satisfies ChartConfig

  // Remounting is what replays the sweep; Recharts only animates from zero on mount
  const dataKey = data.sectors.map((d) => `${d.key}:${d.value}`).join("|")

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-3">
      <div className="relative shrink-0" style={{ width: size }}>
        {/* Above the centre total, so a tooltip crossing the hole covers it rather than
            having the figure show through */}
        <ChartContainer config={config} className="relative z-10 aspect-square w-full">
          <PieChart key={inView ? `in-view:${dataKey}` : "waiting"}>
            <ChartTooltip content={<SectorTooltip />} />
            <Pie
              data={data.sectors}
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
              {data.sectors.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <CenterTotal key={dataKey} total={data.total} centerLabel={centerLabel} counting={inView} />
      </div>

      {/* Grouped by sector: the sector with its total, then its scale breakdown */}
      <ul className="min-w-36 flex-1 space-y-1.5 text-xs">
        {data.sectors.map((group) => (
          <li key={group.key}>
            <div className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: group.color }} />
              <span className="flex-1 truncate font-medium">{group.sector}</span>
              <span className="font-semibold tabular-nums">{group.value.toLocaleString("en-IN")}</span>
              <span className="w-9 text-right tabular-nums text-muted-foreground">({pct(group.shareOfTotal)})</span>
            </div>
            <div className="mt-0.5 ml-3.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[0.65rem] text-muted-foreground">
              {group.scales.map((s) => (
                <span key={s.key} className="flex items-center gap-1">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  {s.scale} <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
