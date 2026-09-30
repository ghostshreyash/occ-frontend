import { useEffect, useRef, useState } from "react"

/**
 * True once the element has scrolled into the viewport, and true from then on.
 *
 * Entrance animations (KPI count-ups, donut sweeps) are pointless if they run
 * on mount for a panel three screens down, so they wait for this instead.
 */
export function useInView<T extends Element>(rootMargin = "0px 0px -10% 0px") {
  const ref = useRef<T>(null)
  // Environments without IntersectionObserver just start at the end state.
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined")

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setInView(true)
        observer.disconnect()
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}
