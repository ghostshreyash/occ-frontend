import { Cell, Pie, PieChart } from "recharts"

import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { useCountUp } from "@/hooks/use-count-up"
import { useInView } from "@/hooks/use-in-view"
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion"
import type { Classification, Section } from "@/data/enterprise-classification"

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
 * Hovering a section gives the whole of it: the section's own share of the
 * portfolio, then every sector inside it with its share of that section. This is
 * where the detail is readable — seventeen slices on the ring would not be.
 */
function SectionTooltip({ active, payload }: { active?: boolean; payload?: { payload: unknown }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as Section

  return (
    <div className="grid min-w-56 gap-1 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-1.5 font-medium">
        <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />
        {d.label}
        <span className="ml-auto tabular-nums">
          {d.value.toLocaleString("en-IN")} <span className="text-muted-foreground">({pct(d.shareOfTotal)})</span>
        </span>
      </div>

      <ul className="mt-0.5 border-t pt-1">
        {d.sectors.map((s) => (
          <li key={s.key} className="flex items-baseline gap-2 py-px">
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.sector}</span>
            <span className="shrink-0 font-semibold tabular-nums">{s.value}</span>
            <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">({pct(s.shareOfSection)})</span>
          </li>
        ))}
      </ul>
      <p className="text-[0.62rem] text-muted-foreground">Percentages are of {d.label}.</p>
    </div>
  )
}

/**
 * Enterprise classification: a two-slice ring for the major sections, with the
 * sector breakdown beside it and in the hover.
 *
 * The ring carries only Industry and Retail on purpose. Seventeen sectors on a
 * card this size would be slivers in a palette that has eight colours, so the
 * detail goes where there is room to read it — a grouped list that scrolls, and
 * a tooltip per section.
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
    data.sections.map((d) => [d.key, { label: d.label, color: d.color }])
  ) satisfies ChartConfig

  // Remounting is what replays the sweep; Recharts only animates from zero on mount
  const dataKey = data.sections.map((d) => `${d.key}:${d.value}`).join("|")

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-3">
      <div className="relative shrink-0" style={{ width: size }}>
        {/* Above the centre total, so a tooltip crossing the hole covers it rather
            than having the figure show through */}
        <ChartContainer config={config} className="relative z-10 aspect-square w-full">
          <PieChart key={inView ? `in-view:${dataKey}` : "waiting"}>
            <ChartTooltip content={<SectionTooltip />} />
            <Pie
              data={data.sections}
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
              {data.sections.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <CenterTotal key={dataKey} total={data.total} centerLabel={centerLabel} counting={inView} />
      </div>

      {/* The breakdown, grouped under its section. Scrolls, because seventeen
          sectors will not fit a card whose height is shared with its row. */}
      <ul className="max-h-[8.5rem] min-w-44 flex-1 space-y-1 overflow-y-auto pr-1 text-[0.68rem]">
        {data.sections.map((section) => (
          <li key={section.key}>
            <div className="flex items-center gap-1.5 border-b pb-0.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: section.color }} />
              <span className="flex-1 truncate font-semibold">{section.label}</span>
              <span className="font-semibold tabular-nums">{section.value.toLocaleString("en-IN")}</span>
              <span className="w-8 text-right tabular-nums text-muted-foreground">({pct(section.shareOfTotal)})</span>
            </div>
            <ul className="mt-0.5 mb-1.5 space-y-px">
              {section.sectors.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 pl-1">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground" title={s.sector}>{s.sector}</span>
                  <span className="shrink-0 tabular-nums">{s.value}</span>
                  <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">({pct(s.shareOfSection)})</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
