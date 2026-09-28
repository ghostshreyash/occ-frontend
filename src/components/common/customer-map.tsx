import { useEffect, useRef } from "react"
import { maplibregl } from "@/lib/maplibre"
import { cn } from "cn"

import type { MapPlant } from "@/data/mock"
import { healthStatus } from "@/lib/status"

export type MapView = "global" | "india"

const VIEWS: Record<MapView, [[number, number], [number, number]]> = {
  global: [[-165, -56], [178, 76]],
  india: [[67.5, 6], [97.5, 36.5]],
}

export type RegionLabel = { region: string; customers: number; plants: number; lng: number; lat: number }

/*
 * World basemap drawn from a bundled Natural Earth 1:110m countries file (public/geo),
 * so it needs no tile server or API key. MapLibre paint properties need plain colours
 * (it can't read CSS variables), so these mirror the --brand-navy family.
 */
const COUNTRIES_URL = "/geo/countries-110m.geojson"

function mapStyle(focusCountry?: string): maplibregl.StyleSpecification {
  const focused = focusCountry !== undefined
  return {
    version: 8,
    sources: { countries: { type: "geojson", data: COUNTRIES_URL } },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": focused ? "rgba(0,0,0,0)" : "#081630" } },
      {
        id: "land",
        type: "fill",
        source: "countries",
        ...(focused ? { filter: ["==", ["get", "name"], focusCountry] } : {}),
        paint: { "fill-color": focused ? "#0b1f44" : "#1a3668" },
      },
      {
        id: "borders",
        type: "line",
        source: "countries",
        ...(focused ? { filter: ["==", ["get", "name"], focusCountry] } : {}),
        paint: { "line-color": focused ? "#0b1f44" : "#2e528f", "line-width": 0.6 },
      },
    ],
  }
}

/** Customer plants on a dark world map, coloured by health status (mockup pages 2 & 3) */
export function CustomerMap({
  plants,
  view = "global",
  regionLabels,
  focusCountry,
  interactive = true,
  showControls = interactive,
  showLegend = true,
  className,
  children,
}: {
  plants: MapPlant[]
  view?: MapView
  regionLabels?: RegionLabel[]
  /** Draw only this country (e.g. "India") on a transparent background */
  focusCountry?: string
  interactive?: boolean
  /** Zoom buttons; off when overlays occupy the map corners */
  showControls?: boolean
  showLegend?: boolean
  className?: string
  /** Overlays positioned on top of the map (buttons, stat tiles) */
  children?: React.ReactNode
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const labelMarkers = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!container.current) return
    const instance = new maplibregl.Map({
      container: container.current,
      style: mapStyle(focusCountry),
      bounds: VIEWS[view],
      fitBoundsOptions: { padding: 8 },
      interactive,
      attributionControl: false,
      dragRotate: false,
    })
    if (showControls) instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right")

    for (const plant of plants) {
      const el = document.createElement("div")
      // Colours come from the theme tokens via Tailwind classes
      el.className = cn(
        "size-2.5 rounded-full ring-[3px] ring-white/20 shadow-[0_0_8px_2px_currentColor]",
        healthStatus[plant.status].dot,
        plant.status === "healthy" ? "text-healthy" : plant.status === "attention" ? "text-attention" : "text-critical"
      )
      const marker = new maplibregl.Marker({ element: el }).setLngLat([plant.lng, plant.lat])
      if (interactive) {
        marker.setPopup(
          new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
            `<strong>${plant.name}</strong><br/>${plant.enterprise}<br/>${healthStatus[plant.status].label}`
          )
        )
      }
      marker.addTo(instance)
    }

    map.current = instance
    return () => {
      instance.remove()
      map.current = null
    }
    // Markers are created once; view changes are handled by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plants, interactive, focusCountry])

  // Region call-outs are only meaningful on the world view
  useEffect(() => {
    const instance = map.current
    labelMarkers.current.forEach((m) => m.remove())
    labelMarkers.current = []
    if (!instance || view !== "global" || !regionLabels) return
    for (const r of regionLabels) {
      const el = document.createElement("div")
      el.className = "pointer-events-none text-[11px] leading-tight text-white drop-shadow"
      el.innerHTML = `<div class="font-semibold">${r.region}</div><div class="opacity-85">${r.customers} Customers</div><div class="opacity-85">${r.plants} Plants</div>`
      labelMarkers.current.push(new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(instance))
    }
  }, [view, regionLabels, plants, interactive])

  useEffect(() => {
    map.current?.fitBounds(VIEWS[view], { padding: 8, speed: 1.4 })
  }, [view])

  return (
    <div className={cn("relative overflow-hidden rounded-lg", focusCountry ? "bg-transparent" : "bg-brand-navy", className)}>
      <div className="absolute inset-0">
        <div ref={container} className="size-full text-foreground" />
      </div>
      {showLegend ? (
        <ul className="absolute bottom-3 left-3 space-y-1 rounded-md bg-brand-navy/85 px-3 py-2 text-xs text-brand-navy-foreground ring-1 ring-white/10">
          {(["healthy", "attention", "critical"] as const).map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className={cn("size-2.5 rounded-full", healthStatus[s].dot)} />
              {healthStatus[s].label}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="size-2.5 rounded-full border-2 border-white" /> Plant Location
          </li>
        </ul>
      ) : null}
      {children}
    </div>
  )
}

/** Dark segmented control used on top of maps ("Global View | India View") */
export function MapViewToggle({
  value,
  onChange,
  labels = { global: "Global View", india: "India View" },
  className,
}: {
  value: MapView
  onChange: (v: MapView) => void
  labels?: Record<MapView, string>
  className?: string
}) {
  return (
    <div className={cn("inline-flex rounded-md bg-brand-navy/90 p-0.5 text-xs ring-1 ring-white/20", className)}>
      {(Object.keys(labels) as MapView[]).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded px-3 py-1 font-medium transition-colors",
            v === value ? "bg-primary/30 text-white ring-1 ring-primary" : "text-white/75 hover:text-white"
          )}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  )
}
