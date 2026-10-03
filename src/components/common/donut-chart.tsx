import { Cell, Pie, PieChart } from "recharts"
import { cn } from "cn"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { useCountUp } from "@/hooks/use-count-up"
import { useInView } from "@/hooks/use-in-view"
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion"

/** Ring sweep and centre count-up run together, so the donut reads as one movement. */
const SWEEP_DURATION = 900

export type DonutSlice = { key: string; label: string; value: number; color: string }

/**
 * The total sits in its own component, and outside the chart, on purpose: Recharts keys each
 * sweep on the identity of the Pie's props object, so a parent that re-renders every frame
 * restarts the animation every frame and the ring never visibly moves.
 */
function CenterTotal({ total, centerLabel, counting }: { total: number; centerLabel: string; counting: boolean }) {
  const value = useCountUp(counting ? total : 0, SWEEP_DURATION)
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-lg leading-tight font-bold tabular-nums">{value.toLocaleString("en-IN")}</span>
      <span className="text-[0.62rem] leading-tight text-muted-foreground">{centerLabel}</span>
    </div>
  )
}

/**
 * Donut with a centred total and a legend showing value and share, as on the OCC dashboards.
 *
 * The ring sweeps in and the centre total counts up the first time the chart scrolls into
 * view — panels below the fold would otherwise finish animating before anyone saw them.
 */
export function DonutChart({
  data,
  centerLabel,
  size = 122,
  layout = "row",
}: {
  data: DonutSlice[]
  centerLabel: string
  size?: number
  /** "stacked" centres the ring and puts the breakdown underneath it. */
  layout?: "row" | "stacked"
}) {
  const stacked = layout === "stacked"
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const config = Object.fromEntries(data.map((d) => [d.key, { label: d.label, color: d.color }])) satisfies ChartConfig
  const reduced = usePrefersReducedMotion()
  const { ref, inView } = useInView<HTMLDivElement>()
  /*
   * Recharts morphs one dataset into the next, which on a Global/India switch reads as the
   * slices nudging rather than the ring drawing itself. Keying ring and total on the figures
   * remounts both, so every switch sweeps and counts from zero exactly like a fresh load.
   */
  const dataKey = data.map((d) => `${d.key}:${d.value}`).join("|")

  return (
    <div ref={ref} className={cn(stacked ? "flex flex-col items-center gap-4" : "flex flex-wrap items-center gap-3")}>
      <div className="relative shrink-0" style={{ width: size }}>
        {/* Above the centre total, so a tooltip crossing the hole covers it rather than
            having the figure show through */}
        <ChartContainer config={config} className="relative z-10 aspect-square w-full">
          {/* Remounting is what replays the sweep — Recharts only animates from zero on mount. */}
          <PieChart key={inView ? `in-view:${dataKey}` : "waiting"}>
            <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
            <Pie
              data={data}
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
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <CenterTotal key={dataKey} total={total} centerLabel={centerLabel} counting={inView} />
      </div>

      <ul className={cn("text-xs", stacked ? "w-full space-y-1.5 border-t pt-3" : "min-w-24 flex-1 space-y-1")}>
        {data.map((d) => (
          <li key={d.key} className={cn("flex items-center gap-1.5", stacked && "gap-2")}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 truncate">{d.label}</span>
            <span className="font-semibold tabular-nums">{d.value.toLocaleString("en-IN")}</span>
            <span className="w-9 text-right tabular-nums text-muted-foreground">({Math.round((d.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
