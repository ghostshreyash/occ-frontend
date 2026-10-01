import { useMemo, useState } from "react"
import { Download, Eye, Search } from "lucide-react"

import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { criticalAlerts } from "@/data/mock"
import { control, td, th } from "@/lib/data-table"
import { alertSeverity, workStatus, type AlertSeverity, type WorkStatus } from "@/lib/status"

/**
 * Critical Alerts list. There is no dedicated mockup for this screen yet,
 * so it reuses the table styling from the dashboard's Critical Alerts panel.
 */
export function CriticalAlertsPage() {
  const [query, setQuery] = useState("")
  const [severity, setSeverity] = useState<AlertSeverity | "all">("all")
  const [status, setStatus] = useState<WorkStatus | "all">("all")

  const rows = useMemo(
    () =>
      criticalAlerts.filter(
        (a) =>
          (severity === "all" || a.severity === severity) &&
          (status === "all" || a.status === status) &&
          `${a.asset} ${a.plant} ${a.enterprise} ${a.issue} ${a.id}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query, severity, status]
  )

  return (
    <div>
      <PageHeader
        title="Critical Alerts"
        description="Live alerts raised across all enterprises, plants and assets."
        breadcrumbs={[{ label: "Critical Alerts" }]}
        actions={<Button variant="outline" size="sm" className={cn(control, "bg-card")}><Download className="size-3.5" /> Export</Button>}
      />
      <SectionCard
        title={`All Alerts (${rows.length})`}
        actions={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search asset, plant, issue…" className={cn(control, "w-60 bg-card pl-7")} />
            </div>
            <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
              <SelectTrigger size="sm" className={cn(control, "w-36 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {Object.entries(alertSeverity).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger size="sm" className={cn(control, "w-36 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {(["open", "in_progress", "closed"] as const).map((k) => <SelectItem key={k} value={k}>{workStatus[k].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
        contentClassName="px-2"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className={th}>Alert ID</TableHead><TableHead className={th}>Time</TableHead><TableHead className={th}>Severity</TableHead><TableHead className={th}>Enterprise</TableHead>
              <TableHead className={th}>Asset / Location</TableHead><TableHead className={th}>Issue</TableHead><TableHead className={th}>Status</TableHead><TableHead className={cn(th, "text-center")}>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className={cn(td, "font-medium")}>{a.id}</TableCell>
                <TableCell className={cn(td, "text-muted-foreground")}>{a.time}</TableCell>
                <TableCell className={td}><Badge className={cn("rounded px-1.5 py-0 text-[0.65rem]", alertSeverity[a.severity].className)}>{alertSeverity[a.severity].label}</Badge></TableCell>
                <TableCell className={td}>{a.enterprise}</TableCell>
                <TableCell className={td}><div className="font-medium">{a.asset}</div><div className="text-xs text-muted-foreground">(Plant: {a.plant})</div></TableCell>
                <TableCell className={cn(td, "whitespace-normal")}>{a.issue}</TableCell>
                <TableCell className={td}><Badge variant={workStatus[a.status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">{workStatus[a.status].label}</Badge></TableCell>
                <TableCell className={cn(td, "text-center")}><Button variant="ghost" size="icon-sm" className="text-primary" aria-label="View alert"><Eye /></Button></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-xs text-muted-foreground">No alerts match the filters.</TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  )
}
