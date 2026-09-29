import { useEffect, useRef, useState } from "react"
import { Expand } from "lucide-react"
import { maplibregl } from "@/lib/maplibre"
import { cn } from "cn"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { MapPlant } from "@/data/mock"
import { healthStatus, type HealthStatus } from "@/lib/status"

export type MapView = "global" | "india"

const VIEWS: Record<MapView, [[number, number], [number, number]]> = {
  global: [[-168, -56], [178, 68]],
  india: [[67.5, 6], [97.5, 36.5]],
}

export type RegionLabel = { region: string; customers: number; plants: number; lng: number; lat: number }

/*
 * World basemap drawn from a bundled Natural Earth 1:110m countries file (public/geo),
 * so it needs no tile server or API key. MapLibre paint properties need plain colours
 * (it can't read CSS variables), so these mirror the --brand-navy family.
 */
const COUNTRIES_URL = "/geo/countries-110m.geojson"

/** Higher-resolution outlines for the countries we draw on their own. */
const FOCUS_SOURCES: Record<string, string> = { India: "/geo/india-50m.geojson" }

/** State / union-territory boundaries, drawn once the map is zoomed into India. */
const INDIA_STATES_URL = "/geo/india-states.geojson"
/** Below this the country is too small for internal boundaries to help. */
const STATE_BORDER_MIN_ZOOM = 3

function mapStyle(focusCountry?: string): maplibregl.StyleSpecification {
  const focused = focusCountry !== undefined
  const detailed = focused ? FOCUS_SOURCES[focusCountry] : undefined
  // The dedicated files hold one country, so they need no filter.
  const filter = focused && !detailed ? { filter: ["==", ["get", "name"], focusCountry] as never } : {}
  return {
    version: 8,
    sources: {
      countries: { type: "geojson", data: detailed ?? COUNTRIES_URL },
      ...(focused ? {} : { "india-states": { type: "geojson" as const, data: INDIA_STATES_URL } }),
    },
    layers: [
      { id: "ocean", type: "background", paint: { "background-color": focused ? "rgba(0,0,0,0)" : "#081630" } },
      {
        id: "land",
        type: "fill",
        source: "countries",
        ...filter,
        paint: { "fill-color": focused ? "#0b1f44" : "#1c3c72", "fill-opacity": focused ? 1 : 0.95 },
      },
      // Internal boundaries only appear once you are close enough for them to
      // mean something — they stay out of the world view entirely.
      ...(focused
        ? []
        : [
            {
              id: "state-borders",
              type: "line" as const,
              source: "india-states",
              minzoom: STATE_BORDER_MIN_ZOOM,
              paint: {
                "line-color": "#4a79c6",
                "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.4, 6, 0.9] as never,
                "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 4, 0.55, 6, 0.75] as never,
              },
            },
          ]),
      {
        id: "coastline",
        type: "line",
        source: "countries",
        ...filter,
        paint: {
          "line-color": focused ? "#0b1f44" : "#3f6bb4",
          "line-width": focused ? 0.6 : ["interpolate", ["linear"], ["zoom"], 0, 0.4, 4, 1.1],
          "line-opacity": 0.9,
        },
      },
    ],
  }
}

/**
 * Teardrop pin in the style of a mapping app: the status colour fills the body,
 * a white rim lifts it off the land, and the tip marks the exact coordinate.
 */
const pinSvg = (width: number, height: number) => `
<svg width="${width}" height="${height}" viewBox="0 0 24 32" fill="none" aria-hidden="true">
  <path
    d="M12 31s11-12.2 11-19A11 11 0 1 0 1 12c0 6.8 11 19 11 19Z"
    fill="currentColor" stroke="white" stroke-width="2" stroke-linejoin="round"
  />
  <circle cx="12" cy="12" r="4" fill="white" />
</svg>`

const PIN_SIZE = [20, 27] as const

const PIN_TONE: Record<HealthStatus, string> = {
  healthy: "text-healthy",
  attention: "text-attention",
  critical: "text-critical",
  offline: "text-offline",
}

/** Customer plants on a dark world map, coloured by health status (mockup pages 2 & 3) */
export function CustomerMap({
  plants,
  view = "global",
  regionLabels,
  focusCountry,
  interactive = true,
  showControls = interactive,
  marker = "pin",
  expandable = false,
  title = "Customer map",
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
  /** Thumbnail insets use a small dot, so the country shape stays readable. */
  marker?: "pin" | "dot"
  /** Adds a button that opens the same map full size in a dialog. */
  expandable?: boolean
  /** Heading for the expanded view. */
  title?: string
  showLegend?: boolean
  className?: string
  /** Overlays positioned on top of the map (buttons, stat tiles) */
  children?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)
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
      // Without this MapLibre tiles the world sideways, so continents repeat
      // either side of the one you are looking at.
      renderWorldCopies: false,
    })
    if (showControls) {
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "bottom-right")
    }

    for (const plant of plants) {
      const el = document.createElement("div")
      // The pin inherits its fill from these theme tokens via `currentColor`.
      const dot = marker === "dot"
      el.className = cn(
        "transition-transform duration-200",
        dot
          ? cn("size-2 rounded-full ring-2 ring-white/70 shadow-[0_0_7px_2px_currentColor]", healthStatus[plant.status].dot)
          : "drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]",
        !dot && interactive && "cursor-pointer hover:-translate-y-0.5 hover:drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]",
        PIN_TONE[plant.status]
      )
      if (!dot) el.innerHTML = pinSvg(PIN_SIZE[0], PIN_SIZE[1])
      const pin = new maplibregl.Marker({ element: el, anchor: dot ? "center" : "bottom" }).setLngLat([
        plant.lng,
        plant.lat,
      ])
      if (interactive) {
        pin.setPopup(
          new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
            `<strong>${plant.name}</strong><br/>${plant.enterprise}<br/>${healthStatus[plant.status].label}`
          )
        )
      }
      pin.addTo(instance)
    }

    map.current = instance

    return () => {
      instance.remove()
      map.current = null
    }
    // Markers are created once; view changes are handled by the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plants, interactive, focusCountry, marker, showControls])

  // Region call-outs are only meaningful on the world view
  useEffect(() => {
    const instance = map.current
    labelMarkers.current.forEach((m) => m.remove())
    labelMarkers.current = []
    if (!instance || view !== "global" || !regionLabels) return
    for (const r of regionLabels) {
      const el = document.createElement("div")
      el.className =
        "pointer-events-none rounded-md bg-brand-navy/70 px-2 py-1 text-[11px] leading-tight text-white ring-1 ring-white/15 backdrop-blur-[2px]"
      el.innerHTML = `<div class="font-semibold">${r.region}</div><div class="opacity-80">${r.customers} Customers</div><div class="opacity-80">${r.plants} Plants</div>`
      labelMarkers.current.push(new maplibregl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(instance))
    }
  }, [view, regionLabels, plants, interactive])

  useEffect(() => {
    map.current?.fitBounds(VIEWS[view], { padding: 8, speed: 1.4 })
  }, [view])

  return (
    <div className={cn("relative overflow-hidden rounded-lg", focusCountry ? "bg-transparent" : "bg-brand-navy", className)}>
      <div className="absolute inset-0">
        {/* Control styling lives in index.css — see the MapLibre section. */}
        <div ref={container} className="occ-map size-full text-foreground" />
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
      {expandable ? (
        <>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Open full view"
            title="Full view"
            className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-md bg-brand-navy/85 px-2 py-1.5 text-[0.7rem] font-medium text-brand-navy-foreground ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-brand-navy"
          >
            <Expand className="size-3.5" /> Full view
          </button>

          <Dialog open={expanded} onOpenChange={setExpanded}>
            <DialogContent className="max-w-[min(96rem,95vw)] sm:max-w-[min(96rem,95vw)]">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              {expanded ? (
                <CustomerMap
                  plants={plants}
                  view={view}
                  regionLabels={regionLabels}
                  focusCountry={focusCountry}
                  className="h-[72vh]"
                />
              ) : null}
            </DialogContent>
          </Dialog>
        </>
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
