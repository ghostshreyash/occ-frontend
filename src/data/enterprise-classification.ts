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

/**
 * Business classification, so deliberately not the health palette: a section is
 * a hue and its sectors step back from it. Mixing toward transparent rather than
 * white keeps the steps correct in both themes.
 */
const sectionColor: Record<SectorType, string> = {
  Industry: "var(--info)",
  Retail: "var(--highlight)",
}

const shade = (base: string, pct: number) =>
  pct >= 100 ? base : `color-mix(in oklch, ${base} ${pct}%, transparent)`

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
        sectors: own.map((r, i) => ({
          key: `${type}-${r.sector}`,
          sector: r.sector,
          section: type,
          sectionLabel: label,
          value: r.value,
          /*
           * Step back across the section's own sectors, largest staying boldest.
           * The range is divided by how many there are, so a section with eleven
           * sectors still ends on a distinguishable shade rather than repeating
           * the floor for its last few.
           */
          color: shade(base, own.length < 2 ? 100 : 100 - (i / (own.length - 1)) * 58),
          shareOfTotal: total ? (r.value / total) * 100 : 0,
          shareOfSection: value ? (r.value / value) * 100 : 0,
        })),
      }
    })
    .filter((s) => s.value > 0)

  return { total, sections }
}
