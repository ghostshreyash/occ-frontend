import { useCallback, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import {
  ArrowDown,
  ArrowDownWideNarrow,
  ArrowUp,
  FileDown,
  HardHat,
  UserCheck,
  UserMinus,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/common/page-header"
import { StatCard } from "@/components/common/stat-card"
import { SectionCard } from "@/components/common/section-card"
import { ErrorNotice, LoadingBar } from "@/components/common/data-state"
import { elpremarStatusMeta } from "@/data/elpremar-data"
import { listElpremars, type ElpremarRow } from "@/lib/api/elpremars"
import { useResource } from "@/lib/api/use-resource"
import { elpremarRoles, roleStream } from "@/data/master-data"

const th = "h-8 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"
const PAGE_SIZES = [8, 15, 25]

/** Every filter menu opens below its trigger and never flips upward */
const DROP_DOWN = { position: "popper", side: "bottom", align: "start", sideOffset: 4, avoidCollisions: false } as const

/** Dates arrive as DD-MM-YYYY, so they need parsing before they can be compared */
const asTime = (s: string) => {
  const [d, m, y] = s.split("-").map(Number)
  return new Date(y, m - 1, d).getTime() || 0
}

const SORTS = {
  newest: { label: "Recently joined", compare: (a: ElpremarRow, b: ElpremarRow) => asTime(b.joined) - asTime(a.joined) },
  oldest: { label: "Longest serving", compare: (a: ElpremarRow, b: ElpremarRow) => asTime(a.joined) - asTime(b.joined) },
  name: { label: "Name A-Z", compare: (a: ElpremarRow, b: ElpremarRow) => a.name.localeCompare(b.name) },
  experience: { label: "Most experience", compare: (a: ElpremarRow, b: ElpremarRow) => b.experience - a.experience },
} as const
type SortKey = keyof typeof SORTS

/**
 * The empty register, as one value - `data?.rows ?? []` would be a new array
 * every render, and every `useMemo` below depends on it.
 */
const NO_ROWS: ElpremarRow[] = []

const initials = (name: string) =>
  name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

/** ELPREMAR register: KPIs, the certified workforce table, and the entry point to onboarding */
export function ElpremarRegister({ onStart }: { onStart: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const [role, setRole] = useState("all")
  const [status, setStatus] = useState("all")
  const [location, setLocation] = useState("all")
  const [sort, setSort] = useState<SortKey>("newest")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  /*
   * The whole workforce in one read, so the filters, the sort and the KPI tiles
   * all work across every ELPREMAR rather than across one page of them. The
   * read takes no filters: they are typed into, and refetching per keystroke
   * would be slower than narrowing a list this size in the browser.
   */
  const read = useCallback(() => listElpremars(), [])
  const { data, error, loading, reload } = useResource(read)
  const all = data?.rows ?? NO_ROWS

  const locations = useMemo(() => [...new Set(all.map((e) => e.city).filter(Boolean))].sort(), [all])

  const rows = useMemo(
    () =>
      all
        .filter((e) => {
          if (role !== "all" && !e.roles.includes(role)) return false
          if (status !== "all" && e.status !== status) return false
          if (location !== "all" && e.city !== location) return false
          const q = query.trim().toLowerCase()
          if (!q) return true
          /*
           * The enterprise, plant and department are no longer searched here:
           * the list endpoint does not send them. The API's own `search`
           * covers the posting, so a search for a plant belongs there once the
           * filters move server-side.
           */
          return [e.name, e.employeeId, e.designation, ...e.roles, e.city, e.state, e.country]
            .filter(Boolean)
            .some((v) => v.toLowerCase().includes(q))
        })
        .sort(SORTS[sort].compare),
    [all, query, role, status, location, sort]
  )

  /** Counted across the register, not the filtered view */
  const kpis = useMemo(
    () => ({
      total: all.length,
      active: all.filter((e) => e.status === "active").length,
      inactive: all.filter((e) => e.status === "inactive").length,
    }),
    [all]
  )

  /*
   * Any filter change puts you back on page 1, otherwise you can land on an empty page.
   * Adjusting during render (rather than in an effect) avoids a wasted commit.
   */
  const filterKey = `${query}|${role}|${status}|${location}|${sort}|${pageSize}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const pageRows = rows.slice(start, start + pageSize)

  const filtered = query.trim() !== "" || role !== "all" || status !== "all" || location !== "all"
  const clearFilters = () => {
    setQuery("")
    setRole("all")
    setStatus("all")
    setLocation("all")
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="ELPREMARs"
        description="Every certified Electrical Preventive Maintenance and Reliability Specialist registered with OLIVINE."
        breadcrumbs={[{ label: "ELPREMARs" }]}
        actions={
          <Button size="sm" className="h-7 text-xs" onClick={onStart}>
            <Plus className="size-3.5" /> Onboard ELPREMAR
          </Button>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}

      {/* Counted off the register. No month-over-month delta: the API answers
          what is there now, and the figures that carried one were the mock's. */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Total ELPREMARs" value={kpis.total} icon={HardHat} tone="info" variant="plain" />
        <StatCard label="Active" value={kpis.active} icon={UserCheck} tone="healthy" variant="plain" />
        <StatCard label="Inactive" value={kpis.inactive} icon={UserMinus} tone="neutral" variant="plain" />
      </div>

      <SectionCard
        title="Certified Workforce"
        hoverable={false}
        contentClassName="px-0 pb-0"
        actions={
          <span className="text-[0.7rem] tabular-nums text-muted-foreground">
            {rows.length} of {all.length}
          </span>
        }
      >
        <LoadingBar loading={loading} label="Loading the register…" />

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-3 pb-2.5">
          <div className="min-w-0 flex-1 sm:max-w-52">
            <Label htmlFor="elp-search" className="sr-only">Search ELPREMARs</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="elp-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID, enterprise, plant"
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>

          <FilterSelect id="elp-location" label="Location" value={location} onChange={setLocation} allLabel="All Locations" options={locations} width="w-36" icon={MapPin} />
          <FilterSelect id="elp-role" label="Role" value={role} onChange={setRole} allLabel="All Roles" options={[...elpremarRoles]} width="w-44" renderOption={roleStream} />
          <FilterSelect
            id="elp-status"
            label="Status"
            value={status}
            onChange={setStatus}
            allLabel="All Statuses"
            width="w-36"
            options={["active", "inactive"]}
            renderOption={(v) => elpremarStatusMeta[v as keyof typeof elpremarStatusMeta].label}
          />

          {filtered ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger id="elp-sort" size="sm" aria-label="Sort by" className="ml-auto h-7 w-40 text-xs">
              <ArrowDownWideNarrow className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent {...DROP_DOWN}>
              {(Object.keys(SORTS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{SORTS[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-7 text-xs">
            <FileDown className="size-3.5" /> Export
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={`${th} pl-3`}>ELPREMAR</TableHead>
                <TableHead className={th}>Designation / Role</TableHead>
                <TableHead className={`${th} hidden lg:table-cell`}>Location</TableHead>
                <TableHead className={th}>Experience</TableHead>
                <TableHead className={`${th} hidden md:table-cell`}>
                  <button
                    type="button"
                    onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
                    className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                    aria-label={`Sort by date joined, currently ${sort === "oldest" ? "longest serving" : "recently joined"} first`}
                  >
                    Joined
                    {sort === "newest" ? <ArrowDown className="size-3" /> : sort === "oldest" ? <ArrowUp className="size-3" /> : null}
                  </button>
                </TableHead>
                <TableHead className={th}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((e) => {
                const meta = elpremarStatusMeta[e.status]
                return (
                  <TableRow key={e.id} onClick={() => navigate(`/elpremars/${e.id}`)} className="cursor-pointer">
                    <TableCell className={`${td} relative pl-3`}>
                      {/* Status stripe: colour reinforcing the badge at the end of the row */}
                      <span title={`Status: ${meta.label}`} className={cn("absolute inset-y-0 left-0 w-0.5", meta.stripe)}>
                        <span className="sr-only">Status: {meta.label}</span>
                      </span>
                      <Link
                        to={`/elpremars/${e.id}`}
                        onClick={(ev) => ev.stopPropagation()}
                        className="group/name flex items-center gap-2"
                      >
                        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[0.55rem] font-bold", meta.chip)}>
                          {initials(e.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover/name:text-primary group-hover/name:underline">
                            {e.salutation} {e.name}
                          </span>
                          <span className="block text-[0.65rem] tabular-nums text-muted-foreground">{e.employeeId}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className={td}>
                      <div className="font-medium">{e.designation}</div>
                      <div className="text-[0.65rem] text-muted-foreground" title={e.roles.join(", ")}>
                        {e.roles.map(roleStream).join(", ")}
                      </div>
                    </TableCell>
                    <TableCell className={`${td} hidden lg:table-cell`}>
                      <div>{e.city}</div>
                      <div className="text-[0.65rem] text-muted-foreground">{e.country}</div>
                    </TableCell>
                    <TableCell className={`${td} tabular-nums`}>{e.experience} yrs</TableCell>
                    <TableCell className={`${td} hidden tabular-nums md:table-cell`}>{e.joined}</TableCell>
                    <TableCell className={td}>
                      <Badge variant={meta.badge} className="rounded px-1.5 py-0 text-[0.65rem]">{meta.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Empty state: says what happened and offers the next action */}
        {rows.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <HardHat className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {all.length === 0 ? "No ELPREMARs yet" : "No ELPREMARs match these filters"}
              </p>
              <p className="text-xs text-muted-foreground">
                {all.length === 0
                  ? "Onboard the first one and they will appear here."
                  : `Try a different search term, or clear the filters to see all ${all.length}.`}
              </p>
            </div>
            <div className="mt-1 flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                <X className="size-3.5" /> Clear filters
              </Button>
              <Button size="sm" className="h-7 text-xs" onClick={onStart}>
                <Plus className="size-3.5" /> Onboard ELPREMAR
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
              <Label htmlFor="elp-page-size" className="text-[0.7rem] text-muted-foreground">Rows</Label>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger id="elp-page-size" size="sm" aria-label="Rows per page" className="h-6 w-14 text-[0.7rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent {...DROP_DOWN}>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <nav aria-label="Pagination" className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setPage(current - 1)} disabled={current === 1} aria-label="Previous page">
                  <ArrowUp className="size-3.5 -rotate-90" />
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
                <Button variant="ghost" size="icon" className="size-6" onClick={() => setPage(current + 1)} disabled={current === pageCount} aria-label="Next page">
                  <ArrowUp className="size-3.5 rotate-90" />
                </Button>
              </nav>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

/** Labelled select used across the filter bar */
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
  options: readonly string[]
  allLabel: string
  width: string
  icon?: typeof MapPin
  renderOption?: (v: string) => string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      {/* The selected value already reads as the label, so the name is carried by aria-label */}
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
