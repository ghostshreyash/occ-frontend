import { useMemo, useState } from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import { ArrowRight, ClipboardList, Eye, LifeBuoy, Wrench } from "lucide-react"
import { Link } from "react-router"
import { cn } from "cn"

import { AssignElpremarDialog, type AssignTarget, type Booking } from "@/components/common/assign-elpremar-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Elpremar } from "@/data/mock"
import { maintenanceProgress, priorityTone, supportTickets, taskQueue } from "@/data/occ-tables"
import { workStatus, type WorkStatus } from "@/lib/status"

/* Compact cells so three dense tables still fit above the fold */
const th = "h-7 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"
const serial = cn(td, "w-8 tabular-nums text-muted-foreground")

function StatusBadge({ status }: { status: keyof typeof workStatus }) {
  return (
    <Badge variant={workStatus[status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">
      {workStatus[status].label}
    </Badge>
  )
}

/** ELPREMAR / date cells stay blank until the row is assigned */
const Unassigned = () => <span className="text-muted-foreground/60">—</span>

/** Same icon button as Recent Assigned Tasks; opens the assign dialog */
function ActionButton({ assigned, status, onClick }: { assigned: boolean; status: WorkStatus; onClick: () => void }) {
  // (Re)assigning only makes sense before work starts
  const locked = status === "in_progress" || status === "completed" || status === "closed"
  const label = locked
    ? status === "in_progress" ? "Work is already in progress" : "Work is already finished"
    : assigned ? "Reassign ELPREMAR" : "Assign ELPREMAR"
  return (
    <Button variant="ghost" size="icon-sm" className="text-primary" disabled={locked} onClick={onClick} aria-label={label} title={label}>
      <Eye />
    </Button>
  )
}

type Tab = "maintenance" | "tasks" | "tickets"

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

/**
 * Maintenance / Tasks / Tickets as one tabbed panel.
 * `country` filters every tab to a single country (used by the India page);
 * omit it for the global view.
 */
export function OperationsTables({ country, className }: { country?: string; className?: string }) {
  const where = <T extends { country: string }>(rows: T[]) =>
    country ? rows.filter((r) => r.country === country) : rows

  // Local copies so assignments made in the dialog show up straight away (mock data, no API yet)
  const [maintenanceRows, setMaintenanceRows] = useState(maintenanceProgress)
  const [taskRows, setTaskRows] = useState(taskQueue)
  const [ticketRows, setTicketRows] = useState(supportTickets)

  const maintenance = newestFirst(where(maintenanceRows), (r) => r.scheduled)
  const tasks = newestFirst(where(taskRows), (r) => r.due)
  const tickets = newestFirst(where(ticketRows), (r) => r.raised)

  const tabs = [
    { value: "maintenance", label: "Maintenance", icon: Wrench, count: maintenance.length, to: "/maintenance-progress" },
    { value: "tasks", label: "Tasks", icon: ClipboardList, count: tasks.length, to: "/elpremars" },
    { value: "tickets", label: "Support Tickets", icon: LifeBuoy, count: tickets.length, to: "/support-tickets" },
  ]

  // Controlled, so the header's "View All" can point at the active tab's page
  const [active, setActive] = useState("maintenance")
  const activeTab = tabs.find((t) => t.value === active) ?? tabs[0]

  const [assigning, setAssigning] = useState<(AssignTarget & { tab: Tab }) | null>(null)

  // Everything already on someone's books, so the dialog's calendar and job location reflect it
  const bookings = useMemo(
    () =>
      [
        ...maintenanceRows.map((m) => ({ elpremar: m.elpremar, date: m.scheduled, label: m.asset, plant: m.plant, enterprise: m.enterprise })),
        ...taskRows.map((t) => ({ elpremar: t.elpremar, date: t.due, label: t.activity, plant: t.plant, enterprise: t.enterprise })),
        ...ticketRows.map((t) => ({ elpremar: t.elpremar, date: t.scheduled, label: t.subject, plant: t.plant, enterprise: t.enterprise })),
      ].filter((b): b is Booking => !!b.elpremar && !!b.date),
    [maintenanceRows, taskRows, ticketRows]
  )

  const assign = (elpremar: Elpremar, date: Date) => {
    if (!assigning) return
    const { tab, id, title } = assigning
    const d = format(date, "dd-MM-yyyy")

    if (tab === "maintenance")
      setMaintenanceRows((rows) => rows.map((r) => (r.id === id ? { ...r, elpremar: elpremar.name, scheduled: d, status: "assigned" } : r)))
    if (tab === "tasks")
      setTaskRows((rows) => rows.map((r) => (r.id === id ? { ...r, elpremar: elpremar.name, due: d, status: "assigned" } : r)))
    if (tab === "tickets")
      setTicketRows((rows) => rows.map((r) => (r.id === id ? { ...r, elpremar: elpremar.name, scheduled: d, status: "assigned" } : r)))

    toast.success(`${elpremar.name} assigned`, { description: `${title} · ${format(date, "d MMM yyyy")}` })
    setAssigning(null)
  }

  return (
    <Tabs
      value={active}
      onValueChange={setActive}
      className={cn("rounded-lg bg-card shadow-xs ring-1 ring-foreground/10", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2.5">
        <TabsList className="h-7 gap-0.5">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="group/tab px-2 text-xs data-active:bg-primary! data-active:text-primary-foreground! data-active:shadow-sm"
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
        <Link to={activeTab.to} className="flex items-center gap-1 text-[0.7rem] font-medium text-primary hover:underline">
          View All <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="overflow-x-auto px-1 pb-2">
        <TabsContent value="maintenance">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={th}>#</TableHead>
                <TableHead className={cn(th, "hidden md:table-cell")}>Enterprise</TableHead>
                <TableHead className={th}>Plant</TableHead>
                <TableHead className={th}>Asset</TableHead>
                <TableHead className={cn(th, "hidden md:table-cell")}>Type</TableHead>
                <TableHead className={cn(th, "hidden lg:table-cell")}>ELPREMAR</TableHead>
                <TableHead className={cn(th, "hidden sm:table-cell")}>Scheduled</TableHead>
                <TableHead className={th}>Status</TableHead>
                <TableHead className={cn(th, "text-center")}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.map((m, i) => (
                <TableRow key={m.id}>
                  <TableCell className={serial}>{i + 1}</TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>{m.enterprise}</TableCell>
                  <TableCell className={td}>{m.plant}</TableCell>
                  <TableCell className={cn(td, "font-medium")}>{m.asset}</TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>{m.type}</TableCell>
                  <TableCell className={cn(td, "hidden lg:table-cell")}>{m.elpremar ?? <Unassigned />}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums sm:table-cell")}>{m.scheduled ?? <Unassigned />}</TableCell>
                  <TableCell className={td}><StatusBadge status={m.status} /></TableCell>
                  <TableCell className={cn(td, "py-0.5 text-center")}>
                    <ActionButton
                      assigned={!!m.elpremar}
                      status={m.status}
                      onClick={() =>
                        setAssigning({ tab: "maintenance", plant: m.plant, id: m.id, title: m.asset, subtitle: `${m.type} · ${m.plant}, ${m.enterprise}`, elpremar: m.elpremar, date: m.scheduled })
                      }
                    />
                  </TableCell>
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
                <TableHead className={cn(th, "hidden md:table-cell")}>Enterprise</TableHead>
                <TableHead className={th}>Plant</TableHead>
                <TableHead className={cn(th, "hidden md:table-cell")}>Asset</TableHead>
                <TableHead className={th}>Activity</TableHead>
                <TableHead className={cn(th, "hidden lg:table-cell")}>ELPREMAR</TableHead>
                <TableHead className={cn(th, "hidden sm:table-cell")}>Due</TableHead>
                <TableHead className={th}>Priority</TableHead>
                <TableHead className={th}>Status</TableHead>
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
                  <TableCell className={cn(td, "hidden lg:table-cell")}>{t.elpremar ?? <Unassigned />}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums sm:table-cell")}>{t.due ?? <Unassigned />}</TableCell>
                  <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[t.priority])}>{t.priority}</span>
                  </TableCell>
                  <TableCell className={td}><StatusBadge status={t.status} /></TableCell>
                  <TableCell className={cn(td, "py-0.5 text-center")}>
                    <ActionButton
                      assigned={!!t.elpremar}
                      status={t.status}
                      onClick={() =>
                        setAssigning({ tab: "tasks", plant: t.plant, id: t.id, title: t.activity, subtitle: `${t.asset} · ${t.plant}, ${t.enterprise}`, elpremar: t.elpremar, date: t.due })
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
                <TableHead className={cn(th, "hidden md:table-cell")}>Enterprise</TableHead>
                <TableHead className={th}>Plant</TableHead>
                <TableHead className={th}>Subject</TableHead>
                <TableHead className={cn(th, "hidden sm:table-cell")}>Raised</TableHead>
                <TableHead className={cn(th, "hidden lg:table-cell")}>ELPREMAR</TableHead>
                <TableHead className={cn(th, "hidden sm:table-cell")}>Scheduled</TableHead>
                <TableHead className={th}>Priority</TableHead>
                <TableHead className={th}>Status</TableHead>
                <TableHead className={cn(th, "text-center")}>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t, i) => (
                <TableRow key={t.id}>
                  <TableCell className={serial}>{i + 1}</TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>{t.enterprise}</TableCell>
                  <TableCell className={td}>{t.plant}</TableCell>
                  <TableCell className={cn(td, "max-w-56 whitespace-normal")}>{t.subject}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums sm:table-cell")}>{t.raised}</TableCell>
                  <TableCell className={cn(td, "hidden lg:table-cell")}>{t.elpremar ?? <Unassigned />}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums sm:table-cell")}>{t.scheduled ?? <Unassigned />}</TableCell>
                  <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[t.priority])}>{t.priority}</span>
                  </TableCell>
                  <TableCell className={td}><StatusBadge status={t.status} /></TableCell>
                  <TableCell className={cn(td, "py-0.5 text-center")}>
                    <ActionButton
                      assigned={!!t.elpremar}
                      status={t.status}
                      onClick={() =>
                        setAssigning({ tab: "tickets", plant: t.plant, id: t.id, title: t.subject, subtitle: `${t.priority} priority · ${t.plant}, ${t.enterprise}`, elpremar: t.elpremar, date: t.scheduled })
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </div>

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
