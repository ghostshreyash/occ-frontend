/**
 * Enterprise business classification for the dashboard donut.
 *
 * The two master fields stay separate — `sector` and `scale` — and are only
 * brought together when the rings are built. Nothing here stores a combined
 * value like "INDUSTRY_LARGE", so either field can be filtered on its own.
 *
 * These are portfolio-level counts, matching the Total Enterprises tile above
 * the chart. Replace with GET /enterprises/classification (a group-by on the two
 * columns) later; the row shape below is what that endpoint should return.
 */
import { type EnterpriseScale, type SectorType } from "@/data/master-data"

/** One count per (sector, scale) pair — the shape a SQL group-by returns */
export type ClassificationRow = { sector: SectorType; scale: EnterpriseScale; value: number }

export const enterpriseClassification: ClassificationRow[] = [
  { sector: "Industry", scale: "Large", value: 31 },
  { sector: "Industry", scale: "Mid", value: 34 },
  { sector: "Industry", scale: "Small", value: 19 },
  { sector: "Retail", scale: "Large", value: 12 },
  { sector: "Retail", scale: "Mid", value: 19 },
  { sector: "Retail", scale: "Small", value: 13 },
]

export const indiaEnterpriseClassification: ClassificationRow[] = [
  { sector: "Industry", scale: "Large", value: 12 },
  { sector: "Industry", scale: "Mid", value: 14 },
  { sector: "Industry", scale: "Small", value: 8 },
  { sector: "Retail", scale: "Large", value: 5 },
  { sector: "Retail", scale: "Mid", value: 8 },
  { sector: "Retail", scale: "Small", value: 5 },
]

/**
 * Business classification, so deliberately not the health palette: a sector is
 * a hue, and the scales within it are the same hue stepped back. Mixing toward
 * transparent rather than white keeps the steps right in both themes.
 */
const sectorColor: Record<SectorType, string> = {
  Industry: "var(--info)",
  Retail: "var(--highlight)",
}

const scaleStrength: Record<EnterpriseScale, number> = { Large: 100, Mid: 66, Small: 38 }

const shade = (base: string, pct: number) =>
  pct >= 100 ? base : `color-mix(in oklch, ${base} ${pct}%, transparent)`

export type ScaleSlice = {
  key: string
  sector: SectorType
  scale: EnterpriseScale
  value: number
  color: string
  /** Share of all enterprises */
  shareOfTotal: number
  /** Share within this slice's own sector */
  shareOfSector: number
}

export type SectorGroup = {
  key: string
  sector: SectorType
  value: number
  color: string
  shareOfTotal: number
  scales: ScaleSlice[]
}

export type Classification = {
  total: number
  /** Inner ring, one entry per sector */
  sectors: SectorGroup[]
  /** Outer ring, in sector order so each scale sits under its parent */
  scales: ScaleSlice[]
}

/** Roll the two fields up into the inner and outer rings, keeping the grouping */
export function classify(rows: ClassificationRow[]): Classification {
  const total = rows.reduce((n, r) => n + r.value, 0)
  const order: SectorType[] = ["Industry", "Retail"]

  const sectors = order
    .map((sector) => {
      const own = rows.filter((r) => r.sector === sector)
      const value = own.reduce((n, r) => n + r.value, 0)
      return {
        key: sector,
        sector,
        value,
        color: sectorColor[sector],
        shareOfTotal: total ? (value / total) * 100 : 0,
        scales: own.map((r) => ({
          key: `${r.sector}-${r.scale}`,
          sector: r.sector,
          scale: r.scale,
          value: r.value,
          color: shade(sectorColor[r.sector], scaleStrength[r.scale]),
          shareOfTotal: total ? (r.value / total) * 100 : 0,
          shareOfSector: value ? (r.value / value) * 100 : 0,
        })),
      }
    })
    .filter((g) => g.value > 0)

  // Flattened in the same order, so the outer ring lines up under the inner one
  return { total, sectors, scales: sectors.flatMap((g) => g.scales) }
}
