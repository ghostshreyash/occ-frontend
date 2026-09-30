import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { addDays, format } from "date-fns"
import { toast } from "sonner"
import {
  ArrowLeft,
  ClipboardCheck,
  ExternalLink,
  Eye,
  FileText,
  Gauge,
  Image as ImageIcon,
  MapPin,
  SearchCheck,
  Wrench,
} from "lucide-react"
import { cn } from "cn"

import { AssignElpremarDialog, type AssignResult, type AssignTarget, type Booking } from "@/components/common/assign-elpremar-dialog"
import { Detail, EvidenceGallery, Timeline } from "@/components/common/detail-view"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { inspectionTimeline, type Measurement, type Severity } from "@/data/inspection-detail"
import { findInspection, updateInspection, useInspectionDetails, useInspectionRows } from "@/data/inspection-store"
import { addMaintenanceFromInspection } from "@/data/maintenance-store"
import { maintenanceActivities, priorityTone, slotLabel, supportTickets } from "@/data/occ-tables"
import { control, td, th } from "@/lib/data-table"
import { inspectionStatus, workStatus, type WorkStatus } from "@/lib/status"

const look = (s: WorkStatus) => inspectionStatus[s] ?? workStatus[s]

/** A completed inspection keeps its performed-by record, so it is never reassigned */
const reassignable = (s: WorkStatus) => s !== "completed"

const resultTone: Record<Measurement["status"], "success" | "warning" | "critical"> = {
  Pass: "success",
  Attention: "warning",
  Fail: "critical",
}

const severityTone: Record<Severity, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-info-soft text-info-soft-foreground",
  High: "bg-attention-soft text-attention-soft-foreground",
  Critical: "bg-critical-soft text-critical-soft-foreground",
}

/** Plain-English standing, so each status reads for what it actually is */
function narrative(status: WorkStatus, elpremar: string, plant: string, startedAt?: string) {
  if (status === "in_progress")
    return `In progress by ${elpremar} at ${plant}${startedAt ? `, started ${startedAt}` : ""}. Readings are still being captured on site.`
  if (status === "completed") return `Inspection completed and the asset health assessment updated.`
  return `Approved and scheduled for ${elpremar} at ${plant}. Nothing has been recorded against it yet.`
}

export function InspectionActivityDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const rows = useInspectionRows()
  const details = useInspectionDetails()
  const activity = findInspection(id)
  const detail = id ? details[id] : undefined
  const [reassigning, setReassigning] = useState<AssignTarget | null>(null)

  // Everything already on someone's books, so the scheduling modal can spot a clash
  const bookings = useMemo(
    () =>
      ([
        ...rows.map((t) => ({ elpremar: t.elpremar, date: t.due, label: t.activity, plant: t.plant, enterprise: t.enterprise, slot: t.slot })),
        ...maintenanceActivities.map((m) => ({ elpremar: m.elpremar, date: m.scheduled, label: m.asset, plant: m.plant, enterprise: m.enterprise, slot: m.slot })),
        ...supportTickets.map((t) => ({ elpremar: t.elpremar, date: t.scheduled, label: t.subject, plant: t.plant, enterprise: t.enterprise, slot: t.slot })),
      ] as (Omit<Booking, "elpremar" | "date"> & { elpremar?: string; date?: string })[]).filter(
        (b): b is Booking => !!b.elpremar && !!b.date
      ),
    [rows]
  )

  if (!activity || !detail) {
    return (
      <div>
        <PageHeader title="Inspection Activity" breadcrumbs={[{ label: "Inspection Activities", to: "/inspection-activities" }, { label: id ?? "Unknown" }]} />
        <SectionCard title="Not found" hoverable={false}>
          <p className="py-6 text-center text-xs text-muted-foreground">
            No inspection activity with id <span className="font-medium text-foreground">{id}</span>.{" "}
            <Link to="/inspection-activities" className="text-primary hover:underline">Back to the list</Link>
          </p>
        </SectionCard>
      </div>
    )
  }

  const status = look(activity.status)
  const { execution, result } = detail
  const canReassign = reassignable(activity.status)

  const saveReassignment = ({ elpremar, date, slot }: AssignResult) => {
    updateInspection(activity.id, { elpremar: elpremar.name, due: format(date, "dd-MM-yyyy"), slot })
    toast.success(`${activity.activity} reassigned`, {
      description: `${elpremar.name} · ${format(date, "d MMM yyyy")}, ${slotLabel(slot)}`,
    })
    setReassigning(null)
  }

  /** Hand the finding to the maintenance workflow, context and all */
  const scheduleMaintenance = () => {
    const newId = addMaintenanceFromInspection({
      inspectionId: activity.id,
      activity: activity.activity,
      enterprise: activity.enterprise,
      plant: activity.plant,
      country: activity.country,
      asset: activity.asset,
      elpremar: activity.elpremar,
      scheduled: format(addDays(new Date(), 3), "dd-MM-yyyy"),
      slot: 9,
      recommendation: result?.recommendedActions[0] ?? "Condition-based intervention recommended by inspection.",
    })
    toast.success(`Maintenance activity ${newId} raised`, {
      description: `${activity.asset} · ${activity.plant}, ${activity.enterprise}`,
    })
    navigate(`/maintenance-activity-details/${newId}`)
  }

  return (
    <div>
      <PageHeader
        title={activity.activity}
        breadcrumbs={[{ label: "Inspection Activities", to: "/inspection-activities" }, { label: activity.id }]}
        actions={
          <>
            <Button variant="outline" size="sm" className={control} onClick={() => navigate("/inspection-activities")}>
              <ArrowLeft className="size-3.5" /> Back to list
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={control}
              title={canReassign ? "View the booking and reassign it" : "A completed inspection keeps its performed-by record"}
              onClick={() =>
                setReassigning({
                  id: activity.id,
                  title: activity.activity,
                  subtitle: `${activity.asset} · ${activity.plant}, ${activity.enterprise}`,
                  plant: activity.plant,
                  elpremar: activity.elpremar,
                  date: activity.due,
                  slot: activity.slot,
                  approvable: false,
                  reassignable: canReassign,
                })
              }
            >
              <Eye className="size-3.5" /> View
            </Button>
            {result?.maintenanceRequired ? (
              <Button size="sm" className={control} onClick={scheduleMaintenance}>
                <Wrench className="size-3.5" /> Schedule Maintenance
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {/* ---------- What OCC assigned ---------- */}
          <SectionCard title="Inspection Activity" icon={<ClipboardCheck className="size-4 text-primary" />} hoverable={false}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Detail label="Task ID"><span className="font-medium tabular-nums">{activity.id}</span></Detail>
              <Detail label="Inspection Activity / Type">{activity.activity}</Detail>
              <Detail label="Status">
                <Badge variant={status.badge} className="rounded px-1.5 py-0 text-[0.65rem]">{status.label}</Badge>
              </Detail>
              <Detail label="Enterprise">{activity.enterprise}</Detail>
              <Detail label="Plant">{activity.plant}</Detail>
              <Detail label="Asset"><span className="font-medium">{activity.asset}</span></Detail>
              <Detail label="Assigned ELPREMAR">{activity.elpremar}</Detail>
              <Detail label="Due / Scheduled Date & Time">
                <span className="tabular-nums">{activity.due}</span>
                <span className="block text-[0.65rem] tabular-nums text-muted-foreground">{slotLabel(activity.slot)}</span>
              </Detail>
              <Detail label="Priority">
                <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[activity.priority])}>{activity.priority}</span>
              </Detail>
              <Detail label="Assigned / Created By">{detail.createdBy}</Detail>
              <Detail label="Task Description / Instructions" className="col-span-2 sm:col-span-3">
                <span className="text-muted-foreground">{detail.description}</span>
              </Detail>
            </div>
          </SectionCard>

          {/* ---------- What the ELPREMAR executed ---------- */}
          <SectionCard title="Inspection Execution" icon={<SearchCheck className="size-4 text-primary" />} hoverable={false}>
            {execution ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Detail label="Performed By">
                  <span className="font-medium">{execution.performedBy}</span>
                  {execution.performedBy !== activity.elpremar ? (
                    <span className="block text-[0.65rem] text-attention">Differs from the assigned ELPREMAR</span>
                  ) : null}
                </Detail>
                <Detail label="Actual Start Time"><span className="tabular-nums">{execution.startedAt}</span></Detail>
                <Detail label="Actual Completion Time">
                  {execution.completedAt ? (
                    <span className="tabular-nums">{execution.completedAt}</span>
                  ) : (
                    <span className="text-muted-foreground">Still in progress</span>
                  )}
                </Detail>
                <Detail label="Completion Remarks" className="col-span-2 sm:col-span-3">
                  <span className="text-muted-foreground">{execution.remarks}</span>
                </Detail>
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                {narrative(activity.status, activity.elpremar, activity.plant)}
              </p>
            )}
          </SectionCard>

          {/* ---------- The test sheet ---------- */}
          <SectionCard title="Testing & Measurements" icon={<Gauge className="size-4 text-primary" />} hoverable={false} contentClassName="px-2">
            {detail.measurements.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60 hover:bg-muted/60">
                      <TableHead className={th}>Parameter / Test</TableHead>
                      <TableHead className={cn(th, "text-right")}>Result</TableHead>
                      <TableHead className={th}>Unit</TableHead>
                      <TableHead className={th}>Source / Method</TableHead>
                      <TableHead className={th}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.measurements.map((m) => (
                      <TableRow key={m.parameter}>
                        <TableCell className={cn(td, "font-medium")}>{m.parameter}</TableCell>
                        <TableCell className={cn(td, "text-right tabular-nums")}>{m.value}</TableCell>
                        <TableCell className={cn(td, "text-muted-foreground")}>{m.unit}</TableCell>
                        <TableCell className={cn(td, "text-muted-foreground")}>{m.source}</TableCell>
                        <TableCell className={td}>
                          <Badge variant={resultTone[m.status]} className="rounded px-1.5 py-0 text-[0.65rem]">{m.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {activity.status === "in_progress" ? (
                  <p className="px-1 pt-2 text-[0.7rem] text-muted-foreground">
                    Partial sheet — the remaining readings have not been submitted yet.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">No measurements recorded yet.</p>
            )}
          </SectionCard>

          {/* ---------- What was seen, as opposed to measured ---------- */}
          <SectionCard title="Inspection Observations / Findings" icon={<Eye className="size-4 text-primary" />} hoverable={false}>
            {detail.observations.length ? (
              <ul className="space-y-2">
                {detail.observations.map((o) => (
                  <li key={o.type} className="rounded-lg p-3 ring-1 ring-foreground/10">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold">{o.type}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", severityTone[o.severity])}>{o.severity}</span>
                    </div>
                    <div className="mt-1 text-xs">{o.value}</div>
                    <div className="mt-0.5 text-[0.7rem] text-muted-foreground">{o.remarks}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-center text-xs text-muted-foreground">
                {activity.status === "completed" ? "No abnormality recorded during this inspection." : "No observations captured yet."}
              </p>
            )}
          </SectionCard>

          {/* ---------- Evidence ---------- */}
          <SectionCard title="Evidence & Attachments" icon={<ImageIcon className="size-4 text-primary" />} hoverable={false}>
            <EvidenceGallery items={detail.evidence} />
          </SectionCard>
        </div>

        {/* ---------- Sidebar ---------- */}
        <div className="space-y-4">
          <SectionCard title="Inspection Result" icon={<FileText className="size-4 text-primary" />} hoverable={false}>
            {result ? (
              <div className="space-y-2.5">
                <Detail label="Inspection Status">
                  <Badge variant={status.badge} className="rounded px-1.5 py-0 text-[0.65rem]">{status.label}</Badge>
                </Detail>
                <Detail label="Health Score / Classification">
                  <span className="text-sm font-semibold tabular-nums">{result.healthScore}</span>
                  <Badge
                    variant={result.classification === "Healthy" ? "healthy" : result.classification === "Attention" ? "attention" : "critical"}
                    className="ml-2 rounded px-1.5 py-0 text-[0.65rem]"
                  >
                    {result.classification}
                  </Badge>
                </Detail>
                <Detail label="Major Findings">
                  <ul className="mt-0.5 space-y-1 text-muted-foreground">
                    {result.majorFindings.map((f) => (
                      <li key={f} className="flex gap-1.5"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/40" />{f}</li>
                    ))}
                  </ul>
                </Detail>
                <Detail label="Recommended Actions">
                  <ul className="mt-0.5 space-y-1 text-muted-foreground">
                    {result.recommendedActions.map((a) => (
                      <li key={a} className="flex gap-1.5"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />{a}</li>
                    ))}
                  </ul>
                </Detail>
                {result.maintenanceRequired ? (
                  <Button size="sm" className={cn(control, "w-full")} onClick={scheduleMaintenance}>
                    <Wrench className="size-3.5" /> Schedule Maintenance
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {narrative(activity.status, activity.elpremar, activity.plant, execution?.startedAt)}
              </p>
            )}
          </SectionCard>

          <SectionCard title="Asset & Location" icon={<MapPin className="size-4 text-primary" />} hoverable={false}>
            <div className="space-y-2.5">
              <Detail label="Enterprise">{activity.enterprise}</Detail>
              <Detail label="Plant">{activity.plant}, {activity.country}</Detail>
              <Detail label="Location / Area">{detail.area}</Detail>
              <Detail label="Asset Name"><span className="font-medium">{activity.asset}</span></Detail>
              <Detail label="Asset ID / Tag ID"><span className="tabular-nums">{detail.assetTag}</span></Detail>
              <Detail label="Asset Category">{detail.assetCategory}</Detail>
              <Button variant="outline" size="sm" className={cn(control, "w-full bg-card")} asChild>
                <Link to="/enterprises"><ExternalLink className="size-3.5" /> View Asset</Link>
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Activity Timeline" hoverable={false}>
            <Timeline steps={inspectionTimeline(activity, detail)} />
          </SectionCard>
        </div>
      </div>

      <AssignElpremarDialog
        key={reassigning ? reassigning.id : "closed"}
        target={reassigning}
        bookings={bookings}
        onOpenChange={(open) => !open && setReassigning(null)}
        onAssign={saveReassignment}
      />
    </div>
  )
}
