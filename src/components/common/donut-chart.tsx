import { Cell, Label, Pie, PieChart } from "recharts"
import { cn } from "cn"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

export type DonutSlice = { key: string; label: string; value: number; color: string }

/** Donut with a centred total and a legend showing value and share, as on the OCC dashboards */
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

  return (
    <div className={cn(stacked ? "flex flex-col items-center gap-4" : "flex flex-wrap items-center gap-3")}>
      <ChartContainer config={config} className="aspect-square shrink-0" style={{ width: size }}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
          <Pie data={data} dataKey="value" nameKey="key" innerRadius="62%" outerRadius="100%" strokeWidth={2} stroke="var(--card)">
            {data.map((d) => (
              <Cell key={d.key} fill={d.color} />
            ))}
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox)) return null
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} dy="-0.2em" className="fill-foreground text-lg font-bold">
                      {total.toLocaleString("en-IN")}
                    </tspan>
                    <tspan x={viewBox.cx} dy="1.6em" className="fill-muted-foreground text-[0.62rem]">
                      {centerLabel}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className={cn("text-xs", stacked ? "w-full space-y-1.5 border-t pt-3" : "min-w-24 flex-1 space-y-1")}>
        {data.map((d) => (
          <li key={d.key} className={cn("flex items-center gap-1.5", stacked && "gap-2")}>
            <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className={cn("flex-1", stacked ? "truncate" : "truncate")}>{d.label}</span>
            <span className="font-semibold tabular-nums">{d.value.toLocaleString("en-IN")}</span>
            <span className="w-9 text-right tabular-nums text-muted-foreground">({Math.round((d.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
