/**
 * MapLibre setup shared by every map in the app.
 * MapLibre v6 runs its tile parsing in a separate worker file, which Vite does not
 * bundle automatically, so we import the worker as an asset URL and register it once.
 */
import * as maplibregl from "maplibre-gl"
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"
import "maplibre-gl/dist/maplibre-gl.css"

maplibregl.setWorkerUrl(workerUrl)

export { maplibregl }
