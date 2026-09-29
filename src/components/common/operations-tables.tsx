import { useState } from "react"
import { ArrowRight, ClipboardList, LifeBuoy, Wrench } from "lucide-react"
import { Link } from "react-router"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { maintenanceProgress, priorityTone, supportTickets, taskQueue } from "@/data/occ-tables"
import { workStatus } from "@/lib/status"

/* Compact cells so three dense tables still fit above the fold */
const th = "h-7 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"

function StatusBadge({ status }: { status: keyof typeof workStatus }) {
  return (
    <Badge variant={workStatus[status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">
      {workStatus[status].label}
    </Badge>
  )
}

/**
 * Maintenance / Tasks / Tickets as one tabbed panel.
 * `country` filters every tab to a single country (used by the India page);
 * omit it for the global view.
 */
export function OperationsTables({ country, className }: { country?: string; className?: string }) {
  const where = <T extends { country: string }>(rows: T[]) =>
    country ? rows.filter((r) => r.country === country) : rows

  const maintenance = where(maintenanceProgress)
  const tasks = where(taskQueue)
  const tickets = where(supportTickets)

  const tabs = [
    { value: "maintenance", label: "Maintenance", icon: Wrench, count: maintenance.length, to: "/maintenance-progress" },
    { value: "tasks", label: "Tasks", icon: ClipboardList, count: tasks.length, to: "/elpremars" },
    { value: "tickets", label: "Support Tickets", icon: LifeBuoy, count: tickets.length, to: "/support-tickets" },
  ]

  // Controlled, so the header's "View All" can point at the active tab's page
  const [active, setActive] = useState("maintenance")
  const activeTab = tabs.find((t) => t.value === active) ?? tabs[0]

  return (
    <Tabs
      value={active}
      onValueChange={setActive}
      className={cn("rounded-lg bg-card shadow-xs ring-1 ring-foreground/10", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2.5">
        <TabsList className="h-7 gap-0.5">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-2 text-xs">
              <t.icon className="size-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.label.split(" ")[0]}</span>
              <span className="rounded bg-foreground/8 px-1 text-[0.62rem] font-semibold tabular-nums">{t.count}</span>
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
                <TableHead className={th}>ID</TableHead>
                <TableHead className={th}>Asset / Plant</TableHead>
                <TableHead className={cn(th, "hidden md:table-cell")}>Enterprise</TableHead>
                <TableHead className={th}>Type</TableHead>
                <TableHead className={cn(th, "hidden lg:table-cell")}>ELPREMAR</TableHead>
                <TableHead className={cn(th, "hidden sm:table-cell")}>Scheduled</TableHead>
                <TableHead className={th}>Progress</TableHead>
                <TableHead className={th}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className={cn(td, "font-medium text-primary")}>{m.id}</TableCell>
                  <TableCell className={td}>
                    <div className="font-medium">{m.asset}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{m.plant}</div>
                  </TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>{m.enterprise}</TableCell>
                  <TableCell className={td}>{m.type}</TableCell>
                  <TableCell className={cn(td, "hidden lg:table-cell")}>{m.elpremar}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums sm:table-cell")}>{m.scheduled}</TableCell>
                  <TableCell className={td}>
                    <div className="flex items-center gap-1.5">
                      <Progress value={m.progress} className="h-1.5 w-12" />
                      <span className="w-7 text-right text-[0.65rem] tabular-nums text-muted-foreground">{m.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell className={td}><StatusBadge status={m.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="tasks">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={th}>Task ID</TableHead>
                <TableHead className={th}>ELPREMAR</TableHead>
                <TableHead className={cn(th, "hidden md:table-cell")}>Enterprise / Plant</TableHead>
                <TableHead className={th}>Activity</TableHead>
                <TableHead className={cn(th, "hidden sm:table-cell")}>Due</TableHead>
                <TableHead className={th}>Priority</TableHead>
                <TableHead className={th}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className={cn(td, "font-medium text-primary")}>{t.id}</TableCell>
                  <TableCell className={cn(td, "font-medium")}>{t.elpremar}</TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>
                    <div>{t.enterprise}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{t.plant}</div>
                  </TableCell>
                  <TableCell className={cn(td, "max-w-44 whitespace-normal")}>{t.activity}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums sm:table-cell")}>{t.due}</TableCell>
                  <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[t.priority])}>{t.priority}</span>
                  </TableCell>
                  <TableCell className={td}><StatusBadge status={t.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="tickets">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={th}>Ticket</TableHead>
                <TableHead className={cn(th, "hidden md:table-cell")}>Enterprise / Plant</TableHead>
                <TableHead className={th}>Subject</TableHead>
                <TableHead className={cn(th, "hidden sm:table-cell")}>Raised</TableHead>
                <TableHead className={th}>Priority</TableHead>
                <TableHead className={th}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className={cn(td, "font-medium text-primary")}>#{t.id}</TableCell>
                  <TableCell className={cn(td, "hidden md:table-cell")}>
                    <div>{t.enterprise}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{t.plant}</div>
                  </TableCell>
                  <TableCell className={cn(td, "max-w-56 whitespace-normal")}>{t.subject}</TableCell>
                  <TableCell className={cn(td, "hidden tabular-nums sm:table-cell")}>{t.raised}</TableCell>
                  <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[t.priority])}>{t.priority}</span>
                  </TableCell>
                  <TableCell className={td}><StatusBadge status={t.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </div>
    </Tabs>
  )
}
