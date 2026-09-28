import { Cell, Label, Pie, PieChart } from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

export type DonutSlice = { key: string; label: string; value: number; color: string }

/** Donut with a centred total and a legend showing value and share, as on the OCC dashboards */
export function DonutChart({
  data,
  centerLabel,
  size = 170,
}: {
  data: DonutSlice[]
  centerLabel: string
  size?: number
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const config = Object.fromEntries(data.map((d) => [d.key, { label: d.label, color: d.color }])) satisfies ChartConfig

  return (
    <div className="flex flex-wrap items-center gap-4">
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
                    <tspan x={viewBox.cx} dy="-0.2em" className="fill-foreground text-2xl font-bold">
                      {total.toLocaleString("en-IN")}
                    </tspan>
                    <tspan x={viewBox.cx} dy="1.5em" className="fill-muted-foreground text-xs">
                      {centerLabel}
                    </tspan>
                  </text>
                )
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>

      <ul className="min-w-36 flex-1 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="flex-1">{d.label}</span>
            <span className="font-semibold">{d.value.toLocaleString("en-IN")}</span>
            <span className="w-12 text-right text-muted-foreground">({Math.round((d.value / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
