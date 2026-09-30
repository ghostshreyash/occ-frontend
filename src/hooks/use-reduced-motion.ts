import { useEffect, useState } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

/** One-off read, for animations driven outside React (requestAnimationFrame loops). */
export const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia(QUERY).matches

/**
 * Reactive version, for animations a component has to switch off by prop —
 * Recharts' sweep, for instance, which Tailwind's `motion-safe:` cannot reach.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(prefersReducedMotion)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return reduced
}
