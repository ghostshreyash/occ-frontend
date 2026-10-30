import { useCallback, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import {
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Factory,
  FileText,
  MapPin,
  Plus,
  Search,
  Server,
  Sheet,
  X,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/common/page-header"
import { control } from "@/lib/data-table"
import { StatCard } from "@/components/common/stat-card"
import { ErrorNotice, LoadingBar } from "@/components/common/data-state"
import { listEnterprises, type AccountStatus, type EnterpriseRow } from "@/lib/api/enterprises"
import { useResource } from "@/lib/api/use-resource"
import { exportCsv, exportPdf, type ExportColumn } from "@/lib/table-export"
import { industrySectors, retailSectors, type SectorType } from "@/data/master-data" // + enterpriseScales, sectorTypes with the Scale / Sector value filters

const th = "h-8 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"
const PAGE_SIZES = [8, 15, 25]

/*
 * Status on this screen is the **account** status - whether the enterprise may
 * use the platform. Deactivation is the control and nothing is deleted, so
 * Active / Inactive is the whole set.
 *
 * It used to be the health of their assets. The API serves no asset data at
 * all, so health cannot be shown here until there is an endpoint for it; the
 * row stripe and the monogram now reinforce the account status instead.
 */
const statusMeta: Record<AccountStatus, { label: string; stripe: string; chip: string }> = {
  active: { label: "Active", stripe: "bg-healthy", chip: "bg-healthy-soft text-healthy-soft-foreground" },
  inactive: { label: "Inactive", stripe: "bg-neutral", chip: "bg-neutral-soft text-neutral-soft-foreground" },
}

/** Not served by the API yet - an empty cell rather than a plausible number */
const NOT_SERVED = "—"

/**
 * The empty register, as one value.
 *
 * `data?.rows ?? []` would be a fresh array on every render, which is a new
 * dependency for every `useMemo` below it - so the filtering, the sort and the
 * KPI counts would all re-run on each keystroke whether or not the rows moved.
 */
const NO_ROWS: EnterpriseRow[] = []

/** Every filter menu opens below its trigger and never flips upward */
const DROP_DOWN = { position: "popper", side: "bottom", align: "start", sideOffset: 4, avoidCollisions: false } as const

/*
 * The one Sector menu covers both levels of the classification. A record stores
 * `sectorType` ("Industry") and `sector` ("Large Cap") as separate fields, so the
 * menu value says which of the two to match on rather than storing a combined
 * value: "type:Industry" matches the whole section, a bare sector name matches
 * that one sector. Sector names are unique across the two sections, so a bare
 * name is never ambiguous.
 */
const SECTOR_ALL = "all"
const sectionValue = (t: SectorType) => `type:${t}`

const SECTOR_GROUPS: { type: SectorType; label: string; options: readonly string[] }[] = [
  { type: "Industry", label: "Industry Sector", options: industrySectors },
  { type: "Retail", label: "Retail Sector", options: retailSectors },
]

/** True when a record belongs under the chosen menu value */
const matchesSector = (e: EnterpriseRow, value: string) => {
  if (value === SECTOR_ALL) return true
  if (value.startsWith("type:")) return e.sectorType === value.slice(5)
  return e.sector === value
}

/*
 * Sorted on the raw `createdAt` rather than the displayed DD-MM-YYYY, so the
 * comparison never goes through a date format.
 */
const added = (e: EnterpriseRow) => new Date(e.createdAt).getTime() || 0

const SORTS = {
  newest: { label: "Latest added", compare: (a: EnterpriseRow, b: EnterpriseRow) => added(b) - added(a) },
  oldest: { label: "Oldest added", compare: (a: EnterpriseRow, b: EnterpriseRow) => added(a) - added(b) },
  /* Only reachable from the removed Sort menu; restore with it.
  name: { label: "Name A-Z", compare: (a: EnterpriseRow, b: EnterpriseRow) => a.name.localeCompare(b.name) },
  */
} as const
type SortKey = keyof typeof SORTS

/**
 * Shared by the CSV and PDF exports, so both carry what the table shows plus
 * its ids. The asset and ELPREMAR counts are gone along with their columns —
 * there is no endpoint behind either, and an export is the last place to put a
 * guess.
 */
const exportColumns: ExportColumn<EnterpriseRow>[] = [
  { header: "Enterprise ID", value: (e) => e.id },
  { header: "Enterprise", value: (e) => e.name },
  { header: "Short Name", value: (e) => e.shortName },
  { header: "Sector Type", value: (e) => e.sectorType },
  { header: "Sector", value: (e) => e.sector },
  { header: "City", value: (e) => e.city },
  { header: "Country", value: (e) => e.country },
  { header: "Plants", value: (e) => String(e.plants) },
  { header: "Onboarded", value: (e) => e.onboarded },
  { header: "Status", value: (e) => statusMeta[e.status].label },
]

const initials = (name: string) =>
  name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 3).toUpperCase()

/** Enterprise register: KPIs, the full enterprise table, and the entry point to the wizard */
export function EnterpriseRegister({ onStart }: { onStart: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  // Restore alongside the Status filter in the toolbar below:
  // const [status, setStatus] = useState("all")
  const [location, setLocation] = useState("all")
  // One value for both levels - see SECTOR_GROUPS above
  const [sector, setSector] = useState(SECTOR_ALL)
  const [sort, setSort] = useState<SortKey>("newest")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  /*
   * The whole register in one read.
   *
   * `listEnterprises` walks the API's pages, so everything below — the filters,
   * the sector menu, the sort, the KPI tiles and the exports — works across
   * every enterprise rather than across whichever page was last fetched. The
   * read is deliberately unfiltered: the filters are typed into and would
   * otherwise refetch on each keystroke, and the register is small enough that
   * narrowing it in the browser is instant.
   */
  const read = useCallback(() => listEnterprises(), [])
  const { data, error, loading, reload } = useResource(read)
  const all = data?.rows ?? NO_ROWS

  const countries = useMemo(() => [...new Set(all.map((e) => e.country).filter(Boolean))].sort(), [all])

  const rows = useMemo(
    () =>
      all
        .filter((e) => {
          if (!matchesSector(e, sector)) return false
          // if (status !== "all" && e.status !== status) return false
          if (location !== "all" && e.country !== location) return false
          const q = query.trim().toLowerCase()
          if (!q) return true
          return [e.name, e.shortName, e.id, e.sector, e.sectorType, e.country, e.city]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q))
        })
        .sort(SORTS[sort].compare),
    [all, query, sector, location, sort]
  )

  /*
   * The tiles count the whole register, not the filtered view. Assets have no
   * endpoint, so that tile says so rather than showing a number nothing stands
   * behind.
   */
  const kpis = useMemo(
    () => ({
      total: all.length,
      active: all.filter((e) => e.status === "active").length,
      plants: all.reduce((n, e) => n + e.plants, 0),
    }),
    [all]
  )

  /*
   * Any filter change puts you back on page 1, otherwise you can land on an empty page.
   * Adjusting during render (rather than in an effect) avoids a wasted commit —
   * see react.dev "You Might Not Need an Effect".
   */
  const filterKey = `${query}|${sector}|${location}|${sort}|${pageSize}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const pageRows = rows.slice(start, start + pageSize)

  const filtered = query.trim() !== "" || sector !== SECTOR_ALL || location !== "all"
  const clearFilters = () => {
    setQuery("")
    setSector(SECTOR_ALL)
    // setStatus("all")
    setLocation("all")
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Enterprises"
        description="Every enterprise registered with OLIVINE, with its plants and head office."
        breadcrumbs={[{ label: "Enterprises" }]}
        actions={
          <>
            <Button size="sm" className="h-7 text-xs" onClick={onStart}>
              <Plus className="size-3.5" /> Onboard Enterprise
            </Button>
            {/* Exports carry the filtered, sorted set - not just the page on screen */}
            <Button variant="outline" size="sm" className="h-7 bg-card text-xs" onClick={() => exportCsv("enterprises", exportColumns, rows)}>
              <Sheet className="size-3.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className="h-7 bg-card text-xs" onClick={() => exportPdf("Enterprises", exportColumns, rows)}>
              <FileText className="size-3.5" /> Export PDF
            </Button>
          </>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}

      {/*
        Counted off the register itself. There are no month-over-month deltas:
        the API answers what is there now, not what was there last month, and
        the numbers that used to carry one were the mock's.
      */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Total Enterprises" value={kpis.total} icon={Building2} tone="info" variant="plain" />
        <StatCard label="Active" value={kpis.active} icon={CheckCircle2} tone="healthy" variant="plain" />
        <StatCard label="Total Plants" value={kpis.plants} icon={Factory} tone="success" variant="plain" />
        <StatCard
          label="Total Assets"
          value={NOT_SERVED}
          icon={Server}
          tone="highlight"
          variant="plain"
          footer={<span className="text-[0.65rem] text-muted-foreground">No asset endpoint yet</span>}
        />
      </div>

      <section className="flex flex-col rounded-lg bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10">
        {/* Search hard left, filters centred, clear hard right - as on the activity lists */}
        <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
          <div className="relative">
            <Label htmlFor="ent-search" className="sr-only">Search enterprises</Label>
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ent-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search here..."
              className={cn(control, "w-60 bg-card pl-7")}
            />
          </div>

          <div className="mx-auto flex flex-wrap items-center gap-2">
          <FilterSelect id="ent-location" label="Location" value={location} onChange={setLocation} allLabel="All Locations" options={countries} width="w-40" icon={MapPin} />
          <SectorFilter value={sector} onChange={setSector} />
          {/* Status is now the account status, which `listEnterprises` can also
              filter server-side. To restore it:
          <FilterSelect
            id="ent-status"
            label="Status"
            value={status}
            onChange={setStatus}
            allLabel="All Statuses"
            width="w-32"
            options={["active", "inactive"]}
            renderOption={(v) => statusMeta[v as AccountStatus].label}
          /> */}
          </div>

          <Button variant="outline" size="sm" className={cn(control, "bg-card")} disabled={!filtered} onClick={clearFilters}>
            <X className="size-3.5" /> Clear Filters
          </Button>
        </div>


        <LoadingBar loading={loading} label="Loading enterprises…" />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={`${th} pl-3`}>Enterprise</TableHead>
                <TableHead className={th}>Sector</TableHead>
                <TableHead className={`${th} hidden lg:table-cell`}>Location</TableHead>
                <TableHead className={th}>Plants</TableHead>
                <TableHead className={`${th} hidden sm:table-cell`} title="No asset endpoint yet">Assets</TableHead>
                <TableHead className={`${th} hidden md:table-cell`}>
                  <button
                    type="button"
                    onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
                    className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                    aria-label={`Sort by date onboarded, currently ${sort === "oldest" ? "oldest" : "latest"} first`}
                  >
                    Onboarded
                    {sort === "newest" ? <ArrowDown className="size-3" /> : sort === "oldest" ? <ArrowUp className="size-3" /> : null}
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((e) => {
                const meta = statusMeta[e.status]
                return (
                  <TableRow key={e.id} onClick={() => navigate(`/enterprises/${e.id}`)} className="cursor-pointer">
                    <TableCell className={`${td} relative pl-3`}>
                      {/* Status stripe: colour reinforcing the badge at the end of the row */}
                      <span title={`Status: ${meta.label}`} className={cn("absolute inset-y-0 left-0 w-0.5", meta.stripe)}>
                        <span className="sr-only">Status: {meta.label}</span>
                      </span>
                      <Link
                        to={`/enterprises/${e.id}`}
                        onClick={(ev) => ev.stopPropagation()}
                        className="group/name flex items-center gap-2"
                      >
                        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded text-[0.55rem] font-bold", meta.chip)}>
                          {initials(e.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover/name:text-primary group-hover/name:underline">{e.name}</span>
                          {/* The API keys a row by UUID, which is not something
                              an operator reads - the short name is. */}
                          <span className="block truncate text-[0.65rem] text-muted-foreground">{e.shortName}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className={td}>
                      <div className="font-medium">{e.sectorType}</div>
                      <div className="text-[0.65rem] text-muted-foreground">{e.sector}</div>
                    </TableCell>
                    <TableCell className={`${td} hidden lg:table-cell`}>
                      <div>{e.city}</div>
                      <div className="text-[0.65rem] text-muted-foreground">{e.country}</div>
                    </TableCell>
                    <TableCell className={`${td} tabular-nums`}>{e.plants}</TableCell>
                    <TableCell className={`${td} hidden tabular-nums sm:table-cell text-muted-foreground`}>{NOT_SERVED}</TableCell>
                    <TableCell className={`${td} hidden tabular-nums md:table-cell`}>{e.onboarded}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/*
          Empty state: says what happened and offers the next action. A register
          with nothing in it and a filter that matches nothing are different
          situations, and offering "clear the filters" for the first is no help.
          Neither is shown while the first read is still running.
        */}
        {rows.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {all.length === 0 ? "No enterprises yet" : "No enterprises match these filters"}
              </p>
              <p className="text-xs text-muted-foreground">
                {all.length === 0
                  ? "Onboard the first one and it will appear here."
                  : `Try a different search term, or clear the filters to see all ${all.length}.`}
              </p>
            </div>
            <div className="mt-1 flex gap-2">
              {all.length === 0 ? null : (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                  <X className="size-3.5" /> Clear filters
                </Button>
              )}
              <Button size="sm" className="h-7 text-xs" onClick={onStart}>
                <Plus className="size-3.5" /> Onboard Enterprise
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-[0.7rem]">
            <span className="tabular-nums text-muted-foreground">
              Showing <strong className="text-foreground">{start + 1}–{Math.min(start + pageSize, rows.length)}</strong> of{" "}
              <strong className="text-foreground">{rows.length}</strong>
            </span>

            <div className="flex items-center gap-2">
              <Label htmlFor="ent-page-size" className="text-[0.7rem] text-muted-foreground">Rows</Label>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger id="ent-page-size" size="sm" aria-label="Rows per page" className="h-6 w-14 text-[0.7rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent {...DROP_DOWN}>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <nav aria-label="Pagination" className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setPage(current - 1)}
                  disabled={current === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <Button
                    key={n}
                    variant={n === current ? "default" : "ghost"}
                    size="icon"
                    className="size-6 text-[0.7rem] tabular-nums"
                    onClick={() => setPage(n)}
                    aria-label={`Page ${n}`}
                    aria-current={n === current ? "page" : undefined}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setPage(current + 1)}
                  disabled={current === pageCount}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </nav>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

/** Labelled select used across the filter bar */
/**
 * The Sector menu: both sections, each with its own sectors nested under a
 * heading. Picking a heading's "All ..." row filters the whole section; picking
 * a sector filters that one. `sectionValue` keeps the two apart, so nothing here
 * depends on sector names happening to be unique.
 */
function SectorFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id="ent-sector" size="sm" aria-label="Sector" className="h-7 w-52 text-xs">
        <Factory className="size-3.5 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent {...DROP_DOWN} className="max-h-80">
        <SelectItem value={SECTOR_ALL}>All Sectors</SelectItem>
        {SECTOR_GROUPS.map((g) => (
          <SelectGroup key={g.type}>
            <SelectLabel className="text-[0.65rem] tracking-wide text-muted-foreground uppercase">{g.label}</SelectLabel>
            <SelectItem value={sectionValue(g.type)}>All {g.type}</SelectItem>
            {g.options.map((o) => (
              <SelectItem key={o} value={o} className="pl-6">{o}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel,
  width,
  icon: Icon,
  renderOption = (v: string) => v,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  allLabel: string
  width: string
  icon?: typeof MapPin
  renderOption?: (v: string) => string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      {/* The selected value already reads as the label ("All Locations"), so the
          name is carried by aria-label instead of a visible caption. */}
      <SelectTrigger id={id} size="sm" aria-label={label} className={cn("h-7 text-xs", width)}>
        {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
        <SelectValue />
      </SelectTrigger>
      <SelectContent {...DROP_DOWN}>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>{renderOption(o)}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
