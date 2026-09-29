import { useMemo, useState } from "react"
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Factory,
  FileDown,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  UserPlus,
  X,
} from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/common/page-header"
import { StatCard } from "@/components/common/stat-card"
import { SectionCard } from "@/components/common/section-card"
import { enterpriseRecords, enterpriseRegisterKpis, type EnterpriseRecord } from "@/data/occ-tables"
import { healthStatus } from "@/lib/status"

const th = "h-8 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"
const PAGE_SIZES = [8, 15, 25]

const onboardingBadge = { label: "Onboarding", badge: "neutral" as const }
const statusMeta = (s: EnterpriseRecord["status"]) => (s === "onboarding" ? onboardingBadge : healthStatus[s])

/* Status drives the row stripe and the monogram tint — colour reinforces the badge, never replaces it */
const statusAccent: Record<EnterpriseRecord["status"], { stripe: string; chip: string }> = {
  healthy: { stripe: "bg-healthy", chip: "bg-healthy-soft text-healthy-soft-foreground" },
  attention: { stripe: "bg-attention", chip: "bg-attention-soft text-attention-soft-foreground" },
  critical: { stripe: "bg-critical", chip: "bg-critical-soft text-critical-soft-foreground" },
  offline: { stripe: "bg-neutral", chip: "bg-neutral-soft text-neutral-soft-foreground" },
  onboarding: { stripe: "bg-info", chip: "bg-info-soft text-info-soft-foreground" },
}

const initials = (name: string) =>
  name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 3).toUpperCase()

/** Enterprise register: KPIs, the full enterprise table, and the entry point to the wizard */
export function EnterpriseRegister({ onStart }: { onStart: () => void }) {
  const [query, setQuery] = useState("")
  const [type, setType] = useState("all")
  const [status, setStatus] = useState("all")
  const [location, setLocation] = useState("all")
  const [selected, setSelected] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const types = useMemo(() => [...new Set(enterpriseRecords.map((e) => e.type))].sort(), [])
  const countries = useMemo(() => [...new Set(enterpriseRecords.map((e) => e.country))].sort(), [])

  const rows = useMemo(
    () =>
      enterpriseRecords.filter((e) => {
        if (type !== "all" && e.type !== type) return false
        if (status !== "all" && e.status !== status) return false
        if (location !== "all" && e.country !== location) return false
        const q = query.trim().toLowerCase()
        if (!q) return true
        return [e.name, e.id, e.sector, e.country, e.city].some((v) => v.toLowerCase().includes(q))
      }),
    [query, type, status, location]
  )

  /*
   * Any filter change puts you back on page 1, otherwise you can land on an empty page.
   * Adjusting during render (rather than in an effect) avoids a wasted commit —
   * see react.dev "You Might Not Need an Effect".
   */
  const filterKey = `${query}|${type}|${status}|${location}|${pageSize}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize
  const pageRows = rows.slice(start, start + pageSize)

  const filtered = query.trim() !== "" || type !== "all" || status !== "all" || location !== "all"
  const clearFilters = () => {
    setQuery("")
    setType("all")
    setStatus("all")
    setLocation("all")
  }

  const allShownSelected = pageRows.length > 0 && pageRows.every((r) => selected.includes(r.id))
  const toggleAll = () =>
    setSelected(allShownSelected ? selected.filter((id) => !pageRows.some((r) => r.id === id)) : [...new Set([...selected, ...pageRows.map((r) => r.id)])])
  const toggleOne = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <div className="space-y-3">
      <PageHeader
        title="Enterprises"
        description="Every enterprise registered with OLIVINE, with its plants, assets and current health."
        breadcrumbs={[{ label: "Enterprises" }]}
        actions={
          <Button size="sm" className="h-7 text-xs" onClick={onStart}>
            <Plus className="size-3.5" /> Onboard Enterprise
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Total Enterprises" value={enterpriseRegisterKpis.total} delta={enterpriseRegisterKpis.delta.total} icon={Building2} tone="info" variant="plain" />
        <StatCard label="Active" value={enterpriseRegisterKpis.active} delta={enterpriseRegisterKpis.delta.active} icon={CheckCircle2} tone="healthy" variant="plain" />
        <StatCard label="In Onboarding" value={enterpriseRegisterKpis.onboarding} icon={UserPlus} tone="attention" variant="plain" />
        <StatCard label="Total Plants" value={enterpriseRegisterKpis.plants} delta={enterpriseRegisterKpis.delta.plants} icon={Factory} tone="success" variant="plain" />
      </div>

      <SectionCard
        title="Registered Enterprises"
        hoverable={false}
        contentClassName="px-0 pb-0"
        actions={
          <span className="text-[0.7rem] tabular-nums text-muted-foreground">
            {rows.length} of {enterpriseRecords.length}
          </span>
        }
      >
        {/* Filter bar */}
        <div className="flex flex-wrap items-end gap-2 border-b px-3 pb-2.5">
          <div className="min-w-0 flex-1 sm:max-w-52">
            <Label htmlFor="ent-search" className="sr-only">Search enterprises</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ent-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID, sector"
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>

          <FilterSelect id="ent-location" label="Location" value={location} onChange={setLocation} allLabel="All Locations" options={countries} width="w-40" icon={MapPin} />
          <FilterSelect id="ent-type" label="Type" value={type} onChange={setType} allLabel="All Types" options={types} width="w-36" />
          <FilterSelect
            id="ent-status"
            label="Status"
            value={status}
            onChange={setStatus}
            allLabel="All Statuses"
            width="w-32"
            options={["healthy", "attention", "critical", "onboarding"]}
            renderOption={(v) => statusMeta(v as EnterpriseRecord["status"]).label}
          />

          {filtered ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearFilters}>
              <X className="size-3.5" /> Clear
            </Button>
          ) : null}

          <Button variant="outline" size="sm" className="ml-auto h-7 text-xs">
            <FileDown className="size-3.5" /> Export
          </Button>
        </div>

        {/* Bulk action bar, only once something is selected */}
        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b bg-info-soft px-3 py-1.5 text-xs">
            <span className="font-medium tabular-nums">{selected.length} selected</span>
            <Button variant="outline" size="sm" className="h-6 bg-card text-[0.7rem]">
              <SlidersHorizontal className="size-3" /> Change Status
            </Button>
            <Button variant="outline" size="sm" className="h-6 bg-card text-[0.7rem]">
              <FileDown className="size-3" /> Export Selected
            </Button>
            <Button variant="ghost" size="sm" className="h-6 text-[0.7rem]" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={`${th} w-8 pl-3`}>
                  <Checkbox checked={allShownSelected} onCheckedChange={toggleAll} aria-label="Select all on this page" className="size-3.5" />
                </TableHead>
                <TableHead className={th}>Enterprise</TableHead>
                <TableHead className={th}>Type</TableHead>
                <TableHead className={`${th} hidden md:table-cell`}>Industry Sector</TableHead>
                <TableHead className={`${th} hidden lg:table-cell`}>Location</TableHead>
                <TableHead className={`${th} text-right`}>Plants</TableHead>
                <TableHead className={`${th} hidden text-right sm:table-cell`}>Assets</TableHead>
                <TableHead className={`${th} hidden text-right lg:table-cell`}>ELPREMARs</TableHead>
                <TableHead className={`${th} hidden md:table-cell`}>Onboarded</TableHead>
                <TableHead className={th}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((e) => {
                const meta = statusMeta(e.status)
                const accent = statusAccent[e.status]
                const isSelected = selected.includes(e.id)
                return (
                  <TableRow key={e.id} data-state={isSelected ? "selected" : undefined} className="group/row">
                    <TableCell className="relative px-2 py-1.5 pl-3">
                      {/* Status stripe: colour reinforcing the badge at the end of the row */}
                      <span aria-hidden="true" className={cn("absolute inset-y-0 left-0 w-0.5", accent.stripe)} />
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(e.id)} aria-label={`Select ${e.name}`} className="size-3.5" />
                    </TableCell>
                    <TableCell className={td}>
                      <div className="flex items-center gap-2">
                        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded text-[0.55rem] font-bold", accent.chip)}>
                          {initials(e.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{e.name}</span>
                          <span className="block text-[0.65rem] tabular-nums text-muted-foreground">{e.id}</span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className={td}>{e.type}</TableCell>
                    <TableCell className={`${td} hidden md:table-cell`}>{e.sector}</TableCell>
                    <TableCell className={`${td} hidden lg:table-cell`}>
                      <div>{e.city}</div>
                      <div className="text-[0.65rem] text-muted-foreground">{e.country}</div>
                    </TableCell>
                    <TableCell className={`${td} text-right tabular-nums`}>{e.plants}</TableCell>
                    <TableCell className={`${td} hidden text-right tabular-nums sm:table-cell`}>{e.assets.toLocaleString("en-IN")}</TableCell>
                    <TableCell className={`${td} hidden text-right tabular-nums lg:table-cell`}>{e.elpremars}</TableCell>
                    <TableCell className={`${td} hidden tabular-nums md:table-cell`}>{e.onboarded}</TableCell>
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
        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium">No enterprises match these filters</p>
              <p className="text-xs text-muted-foreground">
                Try a different search term, or clear the filters to see all {enterpriseRecords.length}.
              </p>
            </div>
            <div className="mt-1 flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearFilters}>
                <X className="size-3.5" /> Clear filters
              </Button>
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
                <SelectTrigger id="ent-page-size" size="sm" className="h-6 w-14 text-[0.7rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
  options: string[]
  allLabel: string
  width: string
  icon?: typeof MapPin
  renderOption?: (v: string) => string
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-0.5 block text-[0.62rem] text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} size="sm" className={cn("h-7 text-xs", width)}>
          {Icon ? <Icon className="size-3.5 text-muted-foreground" /> : null}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>{renderOption(o)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
