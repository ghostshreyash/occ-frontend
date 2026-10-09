import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import type { DateRange } from "react-day-picker"
import { isAfter, isBefore, parse, startOfDay } from "date-fns"
import { toast } from "sonner"
import { Eye, FileText, Search, Sheet, X } from "lucide-react"
import { cn } from "cn"

import { DateRangeFilter, SortHead, TablePager } from "@/components/common/data-table"
import { PageHeader } from "@/components/common/page-header"
import { ResolveTicketDialog } from "@/components/common/resolve-ticket-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { resolveAndCloseTicket, useTicketRows } from "@/data/ticket-store"
import { ticketCategories, ticketPriorities, ticketPriorityTone, type TicketPriority, type TicketRow } from "@/data/occ-tables"
import { useAuth } from "@/lib/auth/context"
import { visibleTickets } from "@/lib/auth/ticket-access"
import { control, nextSort, sortRows, td, th, type Sort } from "@/lib/data-table"
import { exportCsv, exportPdf, type ExportColumn } from "@/lib/table-export"
import { ticketFilterStatuses, workStatus, type WorkStatus } from "@/lib/status"

/** dd-MM-yyyy is what the rows carry; everything here compares real dates */
const parseDate = (d: string) => parse(d, "dd-MM-yyyy", new Date())

type SortKey =
  | "id" | "enterprise" | "plant" | "subject" | "category"
  | "raised" | "raisedBy" | "elpremar" | "priority" | "status"

const statusRank: Record<WorkStatus, number> = { open: 0, reopened: 1, pending: 2, rejected: 3, assigned: 4, in_progress: 5, completed: 6, closed: 7 }
const priorityRank: Record<TicketPriority, number> = { High: 0, Medium: 1, Low: 2 }

const sortValue: Record<SortKey, (r: TicketRow) => string | number> = {
  id: (r) => r.id,
  enterprise: (r) => r.enterprise,
  plant: (r) => r.plant,
  subject: (r) => r.subject,
  category: (r) => r.category,
  raised: (r) => parseDate(r.raised).getTime(),
  raisedBy: (r) => r.raisedBy,
  // Unassigned sorts last rather than first, so the queue reads owner-first
  elpremar: (r) => r.elpremar ?? "￿",
  priority: (r) => priorityRank[r.priority],
  status: (r) => statusRank[r.status],
}

/** Columns shared by the CSV and PDF exports, so both carry what the table shows */
const exportColumns: ExportColumn<TicketRow>[] = [
  { header: "Ticket #", value: (r) => r.id },
  { header: "Enterprise", value: (r) => r.enterprise },
  { header: "Plant", value: (r) => r.plant },
  { header: "Subject", value: (r) => r.subject },
  { header: "Category", value: (r) => r.category },
  { header: "Raised", value: (r) => r.raised },
  { header: "Raised By", value: (r) => r.raisedBy },
  { header: "Assigned To", value: (r) => r.elpremar ?? "Unassigned" },
  { header: "Priority", value: (r) => r.priority },
  { header: "Status", value: (r) => workStatus[r.status].label },
]

/** Shown wherever a ticket has no owner yet, so the gap reads as a state */
const Unassigned = () => <span className="text-muted-foreground/70 italic">Unassigned</span>

/** Same ghost icon button the dashboard tickets table uses */
function ActionButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" className="text-primary" onClick={onClick} aria-label="View" title="View">
      <Eye />
    </Button>
  )
}

export function SupportTicketsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const all = useTicketRows()

  // RBAC decides the queue before any filter runs
  const rows = useMemo(() => visibleTickets(all, user), [all, user])

  const [query, setQuery] = useState("")
  const [enterprise, setEnterprise] = useState("all")
  const [category, setCategory] = useState("all")
  const [priority, setPriority] = useState("all")
  const [status, setStatus] = useState<WorkStatus | "all">("all")
  const [range, setRange] = useState<DateRange | undefined>()
  const [sort, setSort] = useState<Sort<SortKey>>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  // The ticket open in the resolve dialog
  const [resolving, setResolving] = useState<TicketRow | null>(null)

  const enterprises = useMemo(() => [...new Set(rows.map((r) => r.enterprise))].sort(), [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const from = range?.from && startOfDay(range.from)
    const to = startOfDay(range?.to ?? range?.from ?? new Date(0))

    return rows.filter((r) => {
      if (enterprise !== "all" && r.enterprise !== enterprise) return false
      if (category !== "all" && r.category !== category) return false
      if (priority !== "all" && r.priority !== priority) return false
      if (status !== "all" && r.status !== status) return false
      if (from) {
        const on = startOfDay(parseDate(r.raised))
        if (isBefore(on, from) || isAfter(on, to)) return false
      }
      // Search covers the row plus the record ids a reporter is likely to quote
      if (!q) return true
      const haystack = [
        r.id, r.subject, r.raisedBy, r.elpremar, r.enterprise, r.plant, r.category, r.source,
        r.assetId, r.inspectionId, r.maintenanceId, r.reportId, workStatus[r.status].label,
      ]
      return haystack.some((f) => f?.toLowerCase().includes(q))
    })
  }, [rows, query, enterprise, category, priority, status, range])

  const sorted = useMemo(() => sortRows(filtered, sort, sortValue), [filtered, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  // Narrowing the results can strand the viewer past the last page, so clamp on read
  const current = Math.min(page, pages)
  const start = (current - 1) * pageSize
  const shown = sorted.slice(start, start + pageSize)

  const filtersOn =
    !!query || enterprise !== "all" || category !== "all" || priority !== "all" || status !== "all" || !!range?.from

  const clearFilters = () => {
    setQuery(""); setEnterprise("all"); setCategory("all"); setPriority("all")
    setStatus("all"); setRange(undefined); setPage(1)
  }

  /** Every filter resets paging, so a narrowed list never opens on an empty page */
  const on = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1) }

  /* ---------- Row action: read the ticket, record what was done, close it ---------- */
  const by = user?.name ? `${user.name} (OCC)` : "Admin (OCC)"

  const submitResolution = (resolution: string) => {
    if (!resolving) return
    resolveAndCloseTicket(resolving.id, resolution, by)
    toast.success(`${resolving.id} closed`, { description: resolving.subject })
    setResolving(null)
  }

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        breadcrumbs={[{ label: "Support Tickets" }]}
        actions={
          <>
            <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => exportCsv("support-tickets", exportColumns, sorted)}>
              <Sheet className="size-3.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => exportPdf("Support Tickets", exportColumns, sorted)}>
              <FileText className="size-3.5" /> Export PDF
            </Button>
          </>
        }
      />

      <section className="flex flex-col rounded-lg bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10">
        {/* Search hard left, filters centred, clear hard right — wraps as it fills */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder="Search here..."
              className={cn(control, "w-64 bg-card pl-7")}
            />
          </div>

          <div className="mx-auto flex flex-wrap items-center gap-2">
            <Select value={enterprise} onValueChange={on(setEnterprise)}>
              <SelectTrigger size="sm" className={cn(control, "w-36 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Enterprises</SelectItem>
                {enterprises.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={on(setCategory)}>
              <SelectTrigger size="sm" className={cn(control, "w-36 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ticketCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={on(setPriority)}>
              <SelectTrigger size="sm" className={cn(control, "w-32 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {ticketPriorities.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={on((v: string) => setStatus(v as WorkStatus | "all"))}>
              <SelectTrigger size="sm" className={cn(control, "w-32 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ticketFilterStatuses.map((k) => <SelectItem key={k} value={k}>{workStatus[k].label}</SelectItem>)}
              </SelectContent>
            </Select>

            <DateRangeFilter label="Raised" range={range} onApply={(r) => { setRange(r); setPage(1) }} />
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
                <SortHead label="Ticket #" column="id" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Enterprise" column="enterprise" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Plant" column="plant" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Subject" column="subject" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Category" column="category" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Raised" column="raised" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Raised By" column="raisedBy" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Assigned To" column="elpremar" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Priority" column="priority" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Status" column="status" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <TableHead className={cn(th, "text-center")}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((r, i) => (
                <TableRow
                  key={r.id}
                  onClick={() => navigate(`/support-ticket-details/${r.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className={cn(td, "tabular-nums text-muted-foreground")}>{start + i + 1}</TableCell>
                  <TableCell className={cn(td, "font-medium whitespace-nowrap")}>
                    <Link
                      to={`/support-ticket-details/${r.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="tabular-nums hover:text-primary hover:underline"
                    >
                      {r.id}
                    </Link>
                  </TableCell>
                  <TableCell className={td}>{r.enterprise}</TableCell>
                  <TableCell className={td}>{r.plant}</TableCell>
                  <TableCell className={cn(td, "max-w-56 font-medium whitespace-normal")}>{r.subject}</TableCell>
                  <TableCell className={cn(td, "whitespace-nowrap")}>{r.category}</TableCell>
                  <TableCell className={cn(td, "tabular-nums whitespace-nowrap")}>{r.raised}</TableCell>
                  <TableCell className={cn(td, "whitespace-nowrap")}>{r.raisedBy}</TableCell>
                  <TableCell className={cn(td, "whitespace-nowrap")}>{r.elpremar ?? <Unassigned />}</TableCell>
                  <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", ticketPriorityTone[r.priority])}>{r.priority}</span>
                  </TableCell>
                  <TableCell className={td}>
                    <Badge variant={workStatus[r.status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">
                      {workStatus[r.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn(td, "py-0.5 text-center")} onClick={(e) => e.stopPropagation()}>
                    <ActionButton onClick={() => setResolving(r)} />
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-8 text-center text-xs text-muted-foreground">
                    No support tickets match the filters.
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

      <ResolveTicketDialog
        key={resolving ? `resolve-${resolving.id}` : "resolve-closed"}
        target={resolving}
        onOpenChange={(open) => !open && setResolving(null)}
        onResolve={submitResolution}
      />
    </div>
  )
}
