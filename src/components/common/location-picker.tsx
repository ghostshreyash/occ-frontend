import { useEffect, useRef } from "react"
import { maplibregl } from "@/lib/maplibre"
import { MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"

/*
 * Street basemap for picking a site location (OpenStreetMap standard tiles).
 * OSM's tile policy allows light development use only; switch to a licensed
 * provider (e.g. MapTiler) before production.
 */
const STREET_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
}

/** Click the map to drop a pin; "Set as Location" copies the coordinates into the form */
export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat?: number
  lng?: number
  onChange: (coords: { lat: number; lng: number }) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const picked = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!container.current) return
    const center: [number, number] = [lng ?? 72.8777, lat ?? 19.0759]
    const instance = new maplibregl.Map({ container: container.current, style: STREET_STYLE, center, zoom: 10 })
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right")
    marker.current = new maplibregl.Marker({ color: "#DC2626" }).setLngLat(center).addTo(instance)
    instance.on("click", (e: maplibregl.MapMouseEvent) => {
      marker.current?.setLngLat(e.lngLat)
      picked.current = { lat: e.lngLat.lat, lng: e.lngLat.lng }
    })
    map.current = instance
    return () => instance.remove()
    // Only initialise once; later coordinate edits move the marker below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (lat === undefined || lng === undefined || Number.isNaN(lat) || Number.isNaN(lng)) return
    marker.current?.setLngLat([lng, lat])
    map.current?.easeTo({ center: [lng, lat] })
  }, [lat, lng])

  return (
    <div className="relative h-40 overflow-hidden rounded-lg ring-1 ring-border">
      <div className="absolute inset-0">
        <div ref={container} className="size-full" />
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="absolute bottom-3 left-3 bg-card shadow"
        onClick={() => {
          const p = picked.current ?? marker.current?.getLngLat()
          if (p) onChange({ lat: Number(p.lat.toFixed(4)), lng: Number(p.lng.toFixed(4)) })
        }}
      >
        <MapPin /> Set as Location
      </Button>
    </div>
  )
}
