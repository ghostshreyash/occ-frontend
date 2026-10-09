import { useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, ClipboardList, Eye, LifeBuoy, Wrench } from "lucide-react"
import { Link } from "react-router"
import { cn } from "cn"

import { AssignElpremarDialog, type AssignResult, type AssignTarget, type Booking } from "@/components/common/assign-elpremar-dialog"
import { ResolveTicketDialog, type ResolveTarget } from "@/components/common/resolve-ticket-dialog"
import { occNavigation } from "@/config/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// + priorityTone, restored with the Inspection tab's Priority column
import { maintenanceProgress, slotLabel, supportTickets, taskQueue, ticketPriorityTone } from "@/data/occ-tables"
// + inspectionStatus, restored with the Inspection tab's Status column
import { maintenanceStatus, workStatus, type WorkStatus } from "@/lib/status"

/* Compact cells so three dense tables still fit above the fold */
const th = "h-7 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"
const serial = cn(td, "w-8 tabular-nums text-muted-foreground")

type StatusLook = (typeof workStatus)[WorkStatus]

function StatusBadge({ status, as }: { status: WorkStatus; as?: StatusLook }) {
  const { label, badge } = as ?? workStatus[status]
  return (
    <Badge variant={badge} className="rounded px-1.5 py-0 text-[0.65rem]">
      {label}
    </Badge>
  )
}

/** A row on its way to becoming a Booking: not one until it has both a person and a date */
type Draft = Omit<Booking, "elpremar" | "date"> & { elpremar?: string; date?: string }

/** A ticket with no owner yet reads as a state, not as a blank cell */
const Unassigned = () => <span className="text-muted-foreground/70 italic">Unassigned</span>

/** Same icon button as Recent Assigned Tasks; opens the row's dialog */
function ActionButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon-sm" className="text-primary" onClick={onClick} aria-label="View" title="View">
      <Eye />
    </Button>
  )
}

type Tab = "maintenance" | "tasks" | "tickets"

/**
 * Each tab is named after its sidebar entry, so "View All" can look its page up
 * rather than repeat the path — the link then follows whatever the sidebar says.
 */
const sidebarPath = (title: string) => occNavigation.find((n) => n.title === title)?.path ?? "/"

/** dd-MM-yyyy → yyyyMMdd, so dates compare as plain strings */
const sortKey = (d?: string) => (d ? d.split("-").reverse().join("") : "")

/** Latest date first; undated (unassigned) rows go on top since they need action */
const newestFirst = <T,>(rows: T[], date: (r: T) => string | undefined) =>
  [...rows].sort((a, b) => {
    const ka = sortKey(date(a))
    const kb = sortKey(date(b))
    if (!ka || !kb) return ka ? 1 : kb ? -1 : 0
    return kb.localeCompare(ka)
  })

/* ---------- Column sorting ---------- */

type Sort = { key: string; dir: "asc" | "desc" } | null
type Accessors<T> = Record<string, (r: T) => string | number | undefined>

const priorityRank: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 }
const statusRank: Record<WorkStatus, number> = { open: 0, pending: 1, rejected: 2, reopened: 3, assigned: 4, in_progress: 5, completed: 6, closed: 7 }

/** Sort by the chosen column; blank (unassigned) values always sink to the bottom */
function sortRows<T>(rows: T[], sort: Sort, accessors: Accessors<T>) {
  const get = sort && accessors[sort.key]
  if (!sort || !get) return rows
  const sign = sort.dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    const va = get(a)
    const vb = get(b)
    if (va === undefined || va === "" || vb === undefined || vb === "") return va === vb ? 0 : va === undefined || va === "" ? 1 : -1
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true })
    return cmp * sign
  })
}

/** Click cycles ascending → descending → back to the default order */
const nextSort = (current: Sort, key: string): Sort =>
  current?.key !== key ? { key, dir: "asc" } : current.dir === "asc" ? { key, dir: "desc" } : null

function SortHead({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string
  column: string
  sort: Sort
  onSort: (column: string) => void
  className?: string
}) {
  const active = sort?.key === column
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <TableHead className={cn(th, className)} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "-mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 uppercase hover:bg-foreground/5 hover:text-foreground",
          active && "text-primary"
        )}
      >
        {label}
        <Icon className={cn("size-3", !active && "opacity-40")} />
      </button>
    </TableHead>
  )
}

/**
 * Maintenance / Tasks / Tickets as one tabbed panel.
 * `country` filters every tab to a single country (used by the India page);
 * omit it for the global view.
 */
/**
 * Maintenance / Inspection Tasks / Support Tickets as one tabbed panel.
 * `country` narrows to a region (India page) and `enterprise` to a single
 * customer (enterprise detail); omit both for the global dashboard view.
 */
export function OperationsTables({
  country,
  enterprise,
  className,
}: {
  country?: string
  enterprise?: string
  className?: string
}) {
  const where = <T extends { country: string; enterprise: string }>(rows: T[]) =>
    rows.filter((r) => (country ? r.country === country : true) && (enterprise ? r.enterprise === enterprise : true))

  // Local copies so assignments made in the dialog show up straight away (mock data, no API yet)
  const [maintenanceRows, setMaintenanceRows] = useState(maintenanceProgress)
  const [taskRows, setTaskRows] = useState(taskQueue)
  const [ticketRows, setTicketRows] = useState(supportTickets)

  // Per-tab column sort; null keeps the default newest-first order
  const [sorts, setSorts] = useState<Record<Tab, Sort>>({ maintenance: null, tasks: null, tickets: null })
  const sortOn = (tab: Tab) => (column: string) => setSorts((s) => ({ ...s, [tab]: nextSort(s[tab], column) }))

  const maintenance = sortRows(newestFirst(where(maintenanceRows), (r) => r.scheduled), sorts.maintenance, {
    enterprise: (r) => r.enterprise,
    plant: (r) => r.plant,
    asset: (r) => r.asset,
    type: (r) => r.type,
    elpremar: (r) => r.elpremar,
    date: (r) => sortKey(r.scheduled),
    status: (r) => statusRank[r.status],
  })
  const tasks = sortRows(newestFirst(where(taskRows), (r) => r.due), sorts.tasks, {
    enterprise: (r) => r.enterprise,
    plant: (r) => r.plant,
    asset: (r) => r.asset,
    activity: (r) => r.activity,
    elpremar: (r) => r.elpremar,
    date: (r) => sortKey(r.due),
    priority: (r) => priorityRank[r.priority],
    status: (r) => statusRank[r.status],
  })
  const tickets = sortRows(newestFirst(where(ticketRows), (r) => r.raised), sorts.tickets, {
    id: (r) => r.id,
    enterprise: (r) => r.enterprise,
    plant: (r) => r.plant,
    subject: (r) => r.subject,
    category: (r) => r.category,
    raised: (r) => sortKey(r.raised),
    elpremar: (r) => r.elpremar,
    priority: (r) => priorityRank[r.priority],
    status: (r) => statusRank[r.status],
  })

  const tabs = [
    { value: "maintenance", label: "Maintenance Activities", icon: Wrench, count: maintenance.length },
    { value: "tasks", label: "Inspection Activities", icon: ClipboardList, count: tasks.length },
    { value: "tickets", label: "Support Tickets", icon: LifeBuoy, count: tickets.length },
  ].map((t) => ({ ...t, to: sidebarPath(t.label) }))

  // Controlled, so the header's "View All" can point at the active tab's page
  const [active, setActive] = useState("maintenance")
  const activeTab = tabs.find((t) => t.value === active) ?? tabs[0]

  const [assigning, setAssigning] = useState<(AssignTarget & { tab: Exclude<Tab, "tickets"> }) | null>(null)
  const [resolving, setResolving] = useState<ResolveTarget | null>(null)

  // Everything already on someone's books, so the dialog's calendar and job location reflect it
  const bookings = useMemo(
    () =>
      ([
        ...maintenanceRows.map((m) => ({ elpremar: m.elpremar, date: m.scheduled, label: m.asset, plant: m.plant, enterprise: m.enterprise, slot: m.slot })),
        ...taskRows.map((t) => ({ elpremar: t.elpremar, date: t.due, label: t.activity, plant: t.plant, enterprise: t.enterprise, slot: t.slot })),
        ...ticketRows.map((t) => ({ elpremar: t.elpremar, date: t.scheduled, label: t.subject, plant: t.plant, enterprise: t.enterprise, slot: t.slot })),
      ] as Draft[]).filter((b): b is Booking => !!b.elpremar && !!b.date),
    [maintenanceRows, taskRows, ticketRows]
  )

  const assign = ({ elpremar, date, slot, approved }: AssignResult) => {
    if (!assigning) return
    const { tab, id, title } = assigning
    const d = format(date, "dd-MM-yyyy")
    // Approving a maintenance activity is what puts it on the books
    const booked = { elpremar: elpremar.name, slot, status: (approved ? "assigned" : "open") as WorkStatus }

    if (tab === "maintenance")
      setMaintenanceRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...booked, scheduled: d } : r)))
    // A task has no assigned state: booked or approved, it is simply To Be Started
    if (tab === "tasks")
      setTaskRows((rows) => rows.map((r) => (r.id === id ? { ...r, elpremar: elpremar.name, slot, due: d, status: "pending" } : r)))

    toast.success(approved ? `${title} approved` : `${elpremar.name} assigned`, {
      description: `${title} · ${elpremar.name} · ${format(date, "d MMM yyyy")}, ${slotLabel(slot)}`,
    })
    setAssigning(null)
  }

  return (
    <Tabs
      value={active}
      onValueChange={setActive}
      className={cn("rounded-lg bg-card shadow-xs ring-1 ring-foreground/10", className)}
    >
      <div className="flex items-center gap-4 px-3 pt-2.5">
        <TabsList className="h-9 min-w-0 flex-1 gap-2.5 bg-transparent! p-0!">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="group/tab h-full! flex-1 cursor-pointer border-foreground/20! bg-card px-2 text-xs text-foreground/75 shadow-xs hover:border-primary/50! hover:bg-info-soft hover:text-primary data-active:border-primary! data-active:bg-primary! data-active:text-primary-foreground! data-active:shadow-sm"
            >
              <t.icon className="size-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              <span className="rounded bg-foreground/8 px-1 text-[0.62rem] font-semibold tabular-nums group-data-active/tab:bg-primary-foreground/20">
                {t.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <Link to={activeTab.to} className="flex shrink-0 items-center gap-1 text-[0.7rem] font-medium text-primary hover:underline">
          View All <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="overflow-x-auto px-1 pb-2">
        <TabsContent value="maintenance">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={th}>#</TableHead>
                <SortHead label="Enterprise" column="enterprise" sort={sorts.maintenance} onSort={sortOn("maintenance")} className="hidden md:table-cell" />
                <SortHead label="Plant" column="plant" sort={sorts.maintenance} onSort={sortOn("maintenance")} />
                <SortHead label="Asset" column="asset" sort={sorts.maintenance} onSort={sortOn("maintenance")} />
                <SortHead label="Type" column="type" sort={sorts.maintenance} onSort={sortOn("maintenance")} className="hidden md:table-cell" />
                <SortHead label="ELPREMAR" column="elpremar" sort={sorts.maintenance} onSort={sortOn("maintenance")} className="hidden lg:table-cell" />
                <SortHead label="Scheduled" column="date" sort={sorts.maintenance} onSort={sortOn("maintenance")} className="hidden sm:table-cell" />
                <SortHead label="Status" column="status" sort={sorts.maintenance} onSort={sortOn("maintenance")} />
                {/* <TableHead className={cn(th, "text-center")}>Action</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell className={serial}>{i + 1}</TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>{m.enterprise}</TableCell>
                  <TableCell className={td}>{m.plant}</TableCell>
                  <TableCell className={cn(td, "font-medium")}>{m.asset}</TableCell>
                  <TableCell className={cn(td, "hidden max-w-32 whitespace-normal md:table-cell")}>{m.type}</TableCell>
                  <TableCell className={cn(td, "hidden lg:table-cell")}>{m.elpremar}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums whitespace-nowrap sm:table-cell")}>
                    {m.scheduled}
                    <span className="block text-[0.65rem] text-muted-foreground">{slotLabel(m.slot)}</span>
                  </TableCell>
                  <TableCell className={td}><StatusBadge status={m.status} as={maintenanceStatus[m.status]} /></TableCell>
                  {/* <TableCell className={cn(td, "py-0.5 text-center")}>
                    <ActionButton
                      onClick={() =>
                        setAssigning({ tab: "maintenance", plant: m.plant, id: m.id, title: m.asset, subtitle: `${m.type} · ${m.plant}, ${m.enterprise}`, elpremar: m.elpremar, date: m.scheduled, slot: m.slot })
                      }
                    />
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="tasks">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={th}>#</TableHead>
                <SortHead label="Enterprise" column="enterprise" sort={sorts.tasks} onSort={sortOn("tasks")} className="hidden md:table-cell" />
                <SortHead label="Plant" column="plant" sort={sorts.tasks} onSort={sortOn("tasks")} />
                <SortHead label="Asset" column="asset" sort={sorts.tasks} onSort={sortOn("tasks")} className="hidden md:table-cell" />
                <SortHead label="Activity" column="activity" sort={sorts.tasks} onSort={sortOn("tasks")} />
                <SortHead label="ELPREMAR" column="elpremar" sort={sorts.tasks} onSort={sortOn("tasks")} className="hidden lg:table-cell" />
                <SortHead label="Due" column="date" sort={sorts.tasks} onSort={sortOn("tasks")} className="hidden sm:table-cell" />
                {/* <SortHead label="Priority" column="priority" sort={sorts.tasks} onSort={sortOn("tasks")} />
                <SortHead label="Status" column="status" sort={sorts.tasks} onSort={sortOn("tasks")} /> */}
                <TableHead className={cn(th, "text-center")}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell className={serial}>{i + 1}</TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>{t.enterprise}</TableCell>
                  <TableCell className={td}>{t.plant}</TableCell>
                  <TableCell className={cn(td, "hidden font-medium md:table-cell")}>{t.asset}</TableCell>
                  <TableCell className={cn(td, "max-w-44 whitespace-normal")}>{t.activity}</TableCell>
                  <TableCell className={cn(td, "hidden lg:table-cell")}>{t.elpremar}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums whitespace-nowrap sm:table-cell")}>
                    {t.due}
                    <span className="block text-[0.65rem] text-muted-foreground">{slotLabel(t.slot)}</span>
                  </TableCell>
                  {/* <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[t.priority])}>{t.priority}</span>
                  </TableCell>
                  <TableCell className={td}><StatusBadge status={t.status} as={inspectionStatus[t.status]} /></TableCell> */}
                  <TableCell className={cn(td, "py-0.5 text-center")}>
                    <ActionButton
                      onClick={() =>
                        setAssigning({ tab: "tasks", approvable: false, plant: t.plant, id: t.id, title: t.activity, subtitle: `${t.asset} · ${t.plant}, ${t.enterprise}`, elpremar: t.elpremar, date: t.due, slot: t.slot })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="tickets">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={th}>#</TableHead>
                <SortHead label="Ticket #" column="id" sort={sorts.tickets} onSort={sortOn("tickets")} />
                <SortHead label="Enterprise" column="enterprise" sort={sorts.tickets} onSort={sortOn("tickets")} className="hidden md:table-cell" />
                <SortHead label="Plant" column="plant" sort={sorts.tickets} onSort={sortOn("tickets")} />
                <SortHead label="Subject" column="subject" sort={sorts.tickets} onSort={sortOn("tickets")} />
                <SortHead label="Category" column="category" sort={sorts.tickets} onSort={sortOn("tickets")} className="hidden lg:table-cell" />
                <SortHead label="Raised" column="raised" sort={sorts.tickets} onSort={sortOn("tickets")} className="hidden sm:table-cell" />
                <SortHead label="Assigned To" column="elpremar" sort={sorts.tickets} onSort={sortOn("tickets")} className="hidden lg:table-cell" />
                <SortHead label="Priority" column="priority" sort={sorts.tickets} onSort={sortOn("tickets")} />
                <SortHead label="Status" column="status" sort={sorts.tickets} onSort={sortOn("tickets")} />
                <TableHead className={cn(th, "text-center")}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell className={serial}>{i + 1}</TableCell>
                  <TableCell className={cn(td, "font-medium whitespace-nowrap tabular-nums")}>{t.id}</TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>{t.enterprise}</TableCell>
                  <TableCell className={td}>{t.plant}</TableCell>
                  <TableCell className={cn(td, "max-w-56 whitespace-normal")}>{t.subject}</TableCell>
                  <TableCell className={cn(td, "hidden lg:table-cell")}>{t.category}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums sm:table-cell")}>{t.raised}</TableCell>
                  <TableCell className={cn(td, "hidden lg:table-cell")}>{t.elpremar ?? <Unassigned />}</TableCell>
                  <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", ticketPriorityTone[t.priority])}>{t.priority}</span>
                  </TableCell>
                  <TableCell className={td}><StatusBadge status={t.status} /></TableCell>
                  <TableCell className={cn(td, "py-0.5 text-center")}>
                    <ActionButton onClick={() => setResolving(t)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </div>

      <ResolveTicketDialog
        key={resolving ? `resolve-${resolving.id}` : "resolve-closed"}
        target={resolving}
        onOpenChange={(open) => !open && setResolving(null)}
        onResolve={(resolution) => {
          if (!resolving) return
          setTicketRows((rows) => rows.map((r) => (r.id === resolving.id ? { ...r, resolution, status: "closed" } : r)))
          toast.success(`${resolving.id} closed`, { description: resolving.subject })
          setResolving(null)
        }}
      />

      <AssignElpremarDialog
        key={assigning ? `${assigning.tab}-${assigning.id}` : "closed"}
        target={assigning}
        bookings={bookings}
        onOpenChange={(open) => !open && setAssigning(null)}
        onAssign={assign}
      />
    </Tabs>
  )
}
