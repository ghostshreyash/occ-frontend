import { useEffect, useRef, useState } from "react"

import { prefersReducedMotion } from "@/hooks/use-reduced-motion"

/** Long enough to read as a count, short enough that the figure is there when you look. */
export const COUNT_UP_DURATION = 900

const easeOut = (t: number) => 1 - (1 - t) ** 3

/** Decimals of the target, so 38,642 counts in whole numbers and 99.5 keeps its half. */
const decimalsOf = (value: number) => (String(value).split(".")[1] ?? "").length

/**
 * Eases a number from where it currently sits up to `value`, re-running whenever the
 * target changes (a dashboard view switch, say). Reduced-motion users get the final
 * figure with no animation at all.
 */
export function useCountUp(value: number, duration = COUNT_UP_DURATION) {
  const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0))
  // Tracks the number on screen, so an interrupted run continues from there
  const from = useRef(display)

  useEffect(() => {
    if (prefersReducedMotion() || from.current === value) {
      from.current = value
      setDisplay(value)
      return
    }
    const start = performance.now()
    const origin = from.current
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / duration, 1)
      const current = t === 1 ? value : origin + (value - origin) * easeOut(t)
      from.current = current
      setDisplay(current)
      if (t < 1) frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [value, duration])

  const factor = 10 ** decimalsOf(value)
  return Math.round(display * factor) / factor
}
