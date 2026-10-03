import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import type { DateRange } from "react-day-picker"
import { isAfter, isBefore, parse, startOfDay } from "date-fns"
import { toast } from "sonner"
import { CheckCheck, FileText, Plus, Search, Sheet, X } from "lucide-react"
import { cn } from "cn"

import { DateRangeFilter, SortHead, TablePager } from "@/components/common/data-table"
import { PageHeader } from "@/components/common/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useMaintenanceRows, updateMaintenance } from "@/data/maintenance-store"
import { maintenanceActivities, slotLabel, type MaintenanceRow } from "@/data/occ-tables"
import { control, nextSort, sortRows, td, th, type Sort } from "@/lib/data-table"
import { exportCsv, exportPdf, type ExportColumn } from "@/lib/table-export"
import { maintenanceStatus, maintenanceStatuses, workStatus, type WorkStatus } from "@/lib/status"

const look = (s: WorkStatus) => maintenanceStatus[s] ?? workStatus[s]

/** dd-MM-yyyy is what the rows carry; everything here compares real dates */
const parseDate = (d: string) => parse(d, "dd-MM-yyyy", new Date())

type SortKey = "id" | "enterprise" | "plant" | "asset" | "type" | "inspectionId" | "elpremar" | "scheduled" | "status"

const statusRank: Record<WorkStatus, number> = { open: 0, pending: 1, rejected: 2, reopened: 3, assigned: 4, in_progress: 5, completed: 6, closed: 7 }

const sortValue: Record<SortKey, (r: MaintenanceRow) => string | number> = {
  id: (r) => r.id,
  enterprise: (r) => r.enterprise,
  plant: (r) => r.plant,
  asset: (r) => r.asset,
  type: (r) => r.type,
  inspectionId: (r) => r.inspectionId,
  elpremar: (r) => r.elpremar,
  // Sort on the moment, not the text, so the interval breaks ties within a day
  scheduled: (r) => parseDate(r.scheduled).getTime() + r.slot / 100,
  status: (r) => statusRank[r.status],
}

/* ---------- Page ---------- */

/** Columns shared by the CSV and PDF exports, so both carry what the table shows */
const exportColumns: ExportColumn<MaintenanceRow>[] = [
  { header: "Task ID", value: (r) => r.id },
  { header: "Enterprise", value: (r) => r.enterprise },
  { header: "Plant", value: (r) => r.plant },
  { header: "Asset", value: (r) => r.asset },
  { header: "Type", value: (r) => r.type },
  { header: "Inspection", value: (r) => r.inspectionId },
  { header: "ELPREMAR", value: (r) => r.elpremar },
  { header: "Scheduled", value: (r) => `${r.scheduled} ${slotLabel(r.slot)}` },
  { header: "Status", value: (r) => look(r.status).label },
]

export function MaintenanceActivitiesPage() {
  const navigate = useNavigate()
  const rows = useMaintenanceRows()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<WorkStatus | "all">("all")
  const [enterprise, setEnterprise] = useState("all")
  const [range, setRange] = useState<DateRange | undefined>()
  const [sort, setSort] = useState<Sort<SortKey>>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const enterprises = useMemo(() => [...new Set(maintenanceActivities.map((r) => r.enterprise))].sort(), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const from = range?.from && startOfDay(range.from)
    const to = startOfDay(range?.to ?? range?.from ?? new Date(0))

    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false
      if (enterprise !== "all" && r.enterprise !== enterprise) return false
      if (from) {
        const on = startOfDay(parseDate(r.scheduled))
        if (isBefore(on, from) || isAfter(on, to)) return false
      }
      // Search runs over everything the row shows, including its status wording and interval
      if (!q) return true
      const haystack = [r.id, r.enterprise, r.plant, r.asset, r.type, r.inspectionId, r.elpremar, r.scheduled, slotLabel(r.slot), look(r.status).label]
      return haystack.some((f) => f.toLowerCase().includes(q))
    })
  }, [rows, query, status, enterprise, range])

  const sorted = useMemo(() => sortRows(filtered, sort, sortValue), [filtered, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  // Narrowing the results can strand the viewer past the last page, so clamp on read
  const current = Math.min(page, pages)
  const start = (current - 1) * pageSize
  const shown = sorted.slice(start, start + pageSize)

  /** Sign a single activity off from its row, without leaving the list */
  const approveRow = (r: MaintenanceRow) => {
    updateMaintenance(r.id, { status: "assigned" })
    toast.success(`${r.asset} approved`, { description: `${r.id} · ${r.elpremar}` })
  }

  const filtersOn = !!query || status !== "all" || enterprise !== "all" || !!range?.from
  const clearFilters = () => {
    setQuery("")
    setStatus("all")
    setEnterprise("all")
    setRange(undefined)
  }

  return (
    <div>
      <PageHeader
        title="Maintenance Activities"
        breadcrumbs={[{ label: "Maintenance Activities" }]}
        actions={
          <>
            <Button size="sm" className={control} disabled title="The intake form is not built yet">
              <Plus className="size-3.5" /> Add Maintenance Activity
            </Button>
            <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => exportCsv("maintenance-activities", exportColumns, sorted)}>
              <Sheet className="size-3.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => exportPdf("Maintenance Activities", exportColumns, sorted)}>
              <FileText className="size-3.5" /> Export PDF
            </Button>
          </>
        }
      />

      <section className="flex flex-col rounded-lg bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10">
        {/* Search hard left, filters centred, clear hard right */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder="Search here..."
              className={cn(control, "w-60 bg-card pl-7")}
            />
          </div>
          <div className="mx-auto flex flex-wrap items-center gap-2">
            <Select value={enterprise} onValueChange={(v) => { setEnterprise(v); setPage(1) }}>
              <SelectTrigger size="sm" className={cn(control, "w-40 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Enterprises</SelectItem>
                {enterprises.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => { setStatus(v as typeof status); setPage(1) }}>
              <SelectTrigger size="sm" className={cn(control, "w-40 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {maintenanceStatuses.map((k) => <SelectItem key={k} value={k}>{look(k).label}</SelectItem>)}
              </SelectContent>
            </Select>
            <DateRangeFilter label="Scheduled" range={range} onApply={(r) => { setRange(r); setPage(1) }} />
          </div>
          <Button variant="outline" size="sm" className={cn(control, "bg-card")} disabled={!filtersOn} onClick={clearFilters}>
            <X className="size-3.5" /> Clear Filters
          </Button>
        </div>

        <div className="overflow-x-auto px-2 pb-3">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={cn(th, "w-10")}>#</TableHead>
                <SortHead label="Task ID" column="id" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Enterprise" column="enterprise" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Plant" column="plant" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Asset" column="asset" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Type" column="type" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Inspection" column="inspectionId" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="ELPREMAR" column="elpremar" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Scheduled" column="scheduled" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Status" column="status" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <TableHead className={cn(th, "text-center")}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r, i) => (
                <TableRow
                  key={r.id}
                  onClick={() => navigate(`/maintenance-activity-details/${r.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className={cn(td, "tabular-nums text-muted-foreground")}>{start + i + 1}</TableCell>
                  <TableCell className={cn(td, "font-medium whitespace-nowrap")}>{r.id}</TableCell>
                  <TableCell className={td}>{r.enterprise}</TableCell>
                  <TableCell className={td}>{r.plant}</TableCell>
                  <TableCell className={cn(td, "font-medium")}>{r.asset}</TableCell>
                  <TableCell className={td}>{r.type}</TableCell>
                  <TableCell className={cn(td, "whitespace-nowrap")} onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/inspection-activity-details/${r.inspectionId}`}
                      className="tabular-nums text-primary hover:underline"
                    >
                      {r.inspectionId}
                    </Link>
                  </TableCell>
                  <TableCell className={td}>{r.elpremar}</TableCell>
                  <TableCell className={cn(td, "tabular-nums whitespace-nowrap")}>
                    {r.scheduled}
                    <span className="block text-[0.65rem] text-muted-foreground">{slotLabel(r.slot)}</span>
                  </TableCell>
                  <TableCell className={td}>
                    <Badge variant={look(r.status).badge} className="rounded px-1.5 py-0 text-[0.65rem]">{look(r.status).label}</Badge>
                  </TableCell>
                  <TableCell className={cn(td, "py-0.5 text-center")} onClick={(e) => e.stopPropagation()}>
                    {r.status === "open" ? (
                      <Button size="sm" className="h-6 px-2 text-[0.7rem]" onClick={() => approveRow(r)}>
                        <CheckCheck className="size-3" /> Approve
                      </Button>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-xs text-muted-foreground">
                    No maintenance activities match the filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <TablePager
            page={current}
            pages={pages}
            pageSize={pageSize}
            total={sorted.length}
            start={start}
            onPage={setPage}
            onPageSize={(n) => { setPageSize(n); setPage(1) }}
          />
        </div>
      </section>

    </div>
  )
}
