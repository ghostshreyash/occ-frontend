import { cn } from "cn"

import { useCountUp } from "@/hooks/use-count-up"
import { useInView } from "@/hooks/use-in-view"

/** Splits "38,642" or "94%" into the number to animate and whatever trails it. */
const NUMERIC = /^(-?\d[\d,]*(?:\.\d+)?)(.*)$/

function parse(value: number | string) {
  if (typeof value === "number") return { target: value, suffix: "" }
  const match = NUMERIC.exec(value.trim())
  if (!match) return null
  return { target: Number(match[1].replace(/,/g, "")), suffix: match[2] }
}

/**
 * A figure that counts up once it scrolls into view — KPI tiles, donut centres and the
 * overview panels all use it, so every number on a screen lands the same way. Values it
 * cannot read as a number (and reduced-motion users) simply render as-is.
 */
export function CountUp({ value, className }: { value: number | string; className?: string }) {
  const parsed = parse(value)
  const { ref, inView } = useInView<HTMLSpanElement>()
  const current = useCountUp(inView && parsed ? parsed.target : 0)

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {parsed ? `${current.toLocaleString("en-IN")}${parsed.suffix}` : value}
    </span>
  )
}
