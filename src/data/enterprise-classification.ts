/**
 * Enterprise business classification for the dashboard donut.
 *
 * Two major sections — Industry and Retail — each broken down by the sector
 * picked on onboarding. `sectorType` and `sector` stay separate fields; nothing
 * here stores a combined value, and the rows below are the shape a
 * `GROUP BY sector_type, sector` returns.
 *
 * The ring shows only the two sections, because seventeen slices on a card this
 * size is unreadable. The breakdown lives beside it and in the hover, which is
 * where the detail is actually legible.
 *
 * Replace with GET /enterprises/classification later.
 */
import type { SectorType } from "@/data/master-data"

/** One count per (section, sector) pair */
export type ClassificationRow = { sectorType: SectorType; sector: string; value: number }

export const enterpriseClassification: ClassificationRow[] = [
  { sectorType: "Industry", sector: "Large Cap", value: 26 },
  { sectorType: "Industry", sector: "Mid Cap", value: 22 },
  { sectorType: "Industry", sector: "Small Cap", value: 14 },
  { sectorType: "Industry", sector: "MSME", value: 11 },
  { sectorType: "Industry", sector: "Startup", value: 6 },
  { sectorType: "Industry", sector: "Government / PSU", value: 5 },

  { sectorType: "Retail", sector: "Hospitals & Healthcare", value: 7 },
  { sectorType: "Retail", sector: "Shopping Malls", value: 6 },
  { sectorType: "Retail", sector: "Commercial Offices", value: 6 },
  { sectorType: "Retail", sector: "Retail Stores", value: 5 },
  { sectorType: "Retail", sector: "Residence", value: 4 },
  { sectorType: "Retail", sector: "Hotels & Restaurants", value: 4 },
  { sectorType: "Retail", sector: "Educational Institutions", value: 4 },
  { sectorType: "Retail", sector: "Warehouses & Logistics", value: 4 },
  { sectorType: "Retail", sector: "Entertainment Facilities", value: 2 },
  { sectorType: "Retail", sector: "Transportation Facilities", value: 1 },
  { sectorType: "Retail", sector: "Religious Facilities", value: 1 },
]

export const indiaEnterpriseClassification: ClassificationRow[] = [
  { sectorType: "Industry", sector: "Large Cap", value: 11 },
  { sectorType: "Industry", sector: "Mid Cap", value: 9 },
  { sectorType: "Industry", sector: "Small Cap", value: 6 },
  { sectorType: "Industry", sector: "MSME", value: 4 },
  { sectorType: "Industry", sector: "Startup", value: 2 },
  { sectorType: "Industry", sector: "Government / PSU", value: 2 },

  { sectorType: "Retail", sector: "Hospitals & Healthcare", value: 3 },
  { sectorType: "Retail", sector: "Shopping Malls", value: 3 },
  { sectorType: "Retail", sector: "Commercial Offices", value: 2 },
  { sectorType: "Retail", sector: "Retail Stores", value: 2 },
  { sectorType: "Retail", sector: "Residence", value: 2 },
  { sectorType: "Retail", sector: "Hotels & Restaurants", value: 2 },
  { sectorType: "Retail", sector: "Educational Institutions", value: 1 },
  { sectorType: "Retail", sector: "Warehouses & Logistics", value: 1 },
  { sectorType: "Retail", sector: "Entertainment Facilities", value: 1 },
  { sectorType: "Retail", sector: "Transportation Facilities", value: 1 },
  // Not every sector is represented in every region
  { sectorType: "Retail", sector: "Religious Facilities", value: 0 },
]

/*
 * Business classification, so deliberately not the health palette - these are the
 * categorical chart tokens.
 *
 * Colour carries the SECTION, not the sector. Seventeen sectors cannot be told
 * apart by hue at any palette: even a perfectly spaced 17-hue set measures a
 * worst adjacent pair of dE 4.4 for normal vision against a floor of 15, and 0.3
 * under deuteranopia. The sectors are separated instead by their arc and the 2px
 * surface gap between slices, and named in the tooltip.
 *
 * The pair is blue/magenta rather than the old blue/violet, which measured dE
 * 12.4 normal and 0.4 deuteranopic - all but identical to a red-green colourblind
 * reader. Blue/magenta measures 33.9 normal and 13.7 CVD, clearing both gates in
 * light and dark. Teal or green would have scored well too but sit beside the
 * green ELPREMAR Status donut on the same row.
 */
const sectionColor: Record<SectorType, string> = {
  Industry: "var(--chart-1)",
  Retail: "var(--chart-7)",
}

export type SectorSlice = {
  key: string
  sector: string
  /** The section this sector sits under, carried so a slice can name its own group */
  section: SectorType
  sectionLabel: string
  value: number
  color: string
  /** Share of all enterprises */
  shareOfTotal: number
  /** Share within this slice's own section */
  shareOfSection: number
}

export type Section = {
  key: SectorType
  label: string
  value: number
  color: string
  shareOfTotal: number
  sectors: SectorSlice[]
}

export type Classification = {
  total: number
  sections: Section[]
}

/** Roll the two fields into the ring's sections and the breakdown beneath each */
export function classify(rows: ClassificationRow[]): Classification {
  const total = rows.reduce((n, r) => n + r.value, 0)
  const order: SectorType[] = ["Industry", "Retail"]

  const sections = order
    .map((type) => {
      // A sector with nobody in it is noise in the list and invisible in the ring
      const own = rows.filter((r) => r.sectorType === type && r.value > 0).sort((a, b) => b.value - a.value)
      const value = own.reduce((n, r) => n + r.value, 0)
      const base = sectionColor[type]

      const label = `${type} Sector`

      return {
        key: type,
        label,
        value,
        color: base,
        shareOfTotal: total ? (value / total) * 100 : 0,
        sectors: own.map((r) => ({
          key: `${type}-${r.sector}`,
          sector: r.sector,
          section: type,
          sectionLabel: label,
          value: r.value,
          // One colour per section - see the note on sectionColor above
          color: base,
          shareOfTotal: total ? (r.value / total) * 100 : 0,
          shareOfSection: value ? (r.value / value) * 100 : 0,
        })),
      }
    })
    .filter((s) => s.value > 0)

  return { total, sections }
}

/* ---------- Drill-down ---------- */

/**
 * The sector palette, in its validated order. Taken in sequence and never
 * reordered - the ordering is what keeps adjacent slices separable. Eight is a
 * hard ceiling, not a style choice: past it no palette clears the floors.
 */
const SECTOR_SERIES = Array.from({ length: 8 }, (_, i) => `var(--sector-${i + 1})`)
const MAX_SLICES = SECTOR_SERIES.length

export type DrillSlice = {
  key: string
  label: string
  value: number
  color: string
  /** Share of the section being drilled into, so the ring sums to 100% */
  shareOfSection: number
  /** Set on the folded slice, naming what went into it */
  rolledUp?: string[]
}

export type Drill = {
  section: Section
  slices: DrillSlice[]
}

/**
 * One section's sectors as their own ring. Sectors are already sorted largest
 * first, so when there are more than eight the smallest are folded into a single
 * "Other" slice that names its members in the tooltip - the alternative is
 * slices nobody can tell apart.
 */
export function drill(data: Classification, type: SectorType): Drill | undefined {
  const section = data.sections.find((s) => s.key === type)
  if (!section) return undefined

  const fits = section.sectors.length <= MAX_SLICES
  const head = fits ? section.sectors : section.sectors.slice(0, MAX_SLICES - 1)
  const tail = fits ? [] : section.sectors.slice(MAX_SLICES - 1)

  const slices: DrillSlice[] = head.map((sector, i) => ({
    key: sector.key,
    label: sector.sector,
    value: sector.value,
    color: SECTOR_SERIES[i],
    shareOfSection: sector.shareOfSection,
  }))

  if (tail.length) {
    const value = tail.reduce((n, t) => n + t.value, 0)
    slices.push({
      key: `${type}-other`,
      label: `Other (${tail.length})`,
      value,
      color: SECTOR_SERIES[MAX_SLICES - 1],
      shareOfSection: section.value ? (value / section.value) * 100 : 0,
      rolledUp: tail.map((t) => t.sector),
    })
  }

  return { section, slices }
}
