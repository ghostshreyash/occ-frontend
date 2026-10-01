import { useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  ArrowLeft,
  CheckCheck,
  Flame,
  Image as ImageIcon,
  MapPin,
  Package,
  ShieldCheck,
  Eye,
  Wrench,
  Zap,
} from "lucide-react"
import { cn } from "cn"

import { AssignElpremarDialog, type AssignResult, type AssignTarget, type Booking } from "@/components/common/assign-elpremar-dialog"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Detail, EvidenceGallery, Timeline } from "@/components/common/detail-view"
import { maintenanceTimeline, type Execution } from "@/data/maintenance-detail"
import { findMaintenance, reviewMaintenance, updateMaintenance, useMaintenanceDetails, useMaintenanceRows } from "@/data/maintenance-store"
import { criticalityTone, inspectionActivities, priorityTone, slotLabel, supportTickets } from "@/data/occ-tables"
import { control } from "@/lib/data-table"
import { maintenanceStatus, workStatus, type WorkStatus } from "@/lib/status"

const look = (s: WorkStatus) => maintenanceStatus[s] ?? workStatus[s]

/** Plain-English standing, so each status reads for what it actually is */
function narrative(status: WorkStatus, elpremar: string, plant: string, execution?: Execution) {
  switch (status) {
    case "in_progress":
      return `In progress by ${execution?.performedBy ?? elpremar} at ${plant}${execution ? `, started ${execution.startedAt}` : ""}. It comes to OCC for approval once the completed work is submitted.`
    case "open":
      return `Submitted for approval${execution?.endedAt ? ` on ${execution.endedAt}` : ""}. Approve the work, or send it back to ${elpremar} for correction.`
    case "rejected":
      return `Sent back to ${elpremar} for correction. It returns to OCC once the evidence is re-submitted.`
    case "completed":
      return `Completed by ${execution?.performedBy ?? elpremar}${execution?.endedAt ? ` on ${execution.endedAt}` : ""}, approved and closed out. The asset health report has been updated.`
    default:
      return `Approved and on the books for ${elpremar}. The asset health report has been updated.`
  }
}

export function MaintenanceActivityDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const rows = useMaintenanceRows()
  const details = useMaintenanceDetails()
  const activity = findMaintenance(id)
  const detail = id ? details[id] : undefined

  const [reassigning, setReassigning] = useState<AssignTarget | null>(null)

  // Everything already on someone's books, so the scheduling modal can spot a clash
  const bookings = useMemo(
    () =>
      ([
        ...rows.map((m) => ({ elpremar: m.elpremar, date: m.scheduled, label: m.asset, plant: m.plant, enterprise: m.enterprise, slot: m.slot })),
        ...inspectionActivities.map((t) => ({ elpremar: t.elpremar, date: t.due, label: t.activity, plant: t.plant, enterprise: t.enterprise, slot: t.slot })),
        ...supportTickets.map((t) => ({ elpremar: t.elpremar, date: t.scheduled, label: t.subject, plant: t.plant, enterprise: t.enterprise, slot: t.slot })),
      ] as (Omit<Booking, "elpremar" | "date"> & { elpremar?: string; date?: string })[]).filter(
        (b): b is Booking => !!b.elpremar && !!b.date
      ),
    [rows]
  )

  if (!activity || !detail) {
    return (
      <div>
        <PageHeader title="Maintenance Activity" breadcrumbs={[{ label: "Maintenance Activities", to: "/maintenance-activities" }, { label: id ?? "Unknown" }]} />
        <SectionCard title="Not found" hoverable={false}>
          <p className="py-6 text-center text-xs text-muted-foreground">
            No maintenance activity with id <span className="font-medium text-foreground">{id}</span>.{" "}
            <Link to="/maintenance-activities" className="text-primary hover:underline">Back to the list</Link>
          </p>
        </SectionCard>
      </div>
    )
  }

  const status = look(activity.status)
  const { execution, review } = detail
  const timeline = maintenanceTimeline(activity, detail)
  const pendingApproval = activity.status === "open"

  const saveReassignment = ({ elpremar, date, slot, approved }: AssignResult) => {
    updateMaintenance(activity.id, {
      elpremar: elpremar.name,
      scheduled: format(date, "dd-MM-yyyy"),
      slot,
      ...(approved ? { status: "assigned" as const } : {}),
    })
    toast.success(approved ? `${activity.asset} approved` : `${elpremar.name} assigned`, {
      description: `${elpremar.name} · ${format(date, "d MMM yyyy")}, ${slotLabel(slot)}`,
    })
    setReassigning(null)
  }

  const submitReview = (outcome: "approved" | "rejected", remarks: string) => {
    reviewMaintenance(activity.id, outcome, "Admin (OCC)", remarks)
    toast.success(outcome === "approved" ? `${activity.asset} approved` : `Correction requested on ${activity.id}`, {
      description: remarks || undefined,
    })
  }

  return (
    <div>
      <PageHeader
        title={activity.asset}
        breadcrumbs={[{ label: "Maintenance Activities", to: "/maintenance-activities" }, { label: activity.id }]}
        actions={
          <Button variant="outline" size="sm" className={control} onClick={() => navigate("/maintenance-activities")}>
            <ArrowLeft className="size-3.5" /> Back to list
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {/* ---------- What OCC assigned ---------- */}
          <SectionCard title="Activity" icon={<Wrench className="size-4 text-primary" />} hoverable={false}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Detail label="Task ID"><span className="font-medium tabular-nums">{activity.id}</span></Detail>
              <Detail label="Maintenance Type">{activity.type}</Detail>
              <Detail label="Status">
                <Badge variant={status.badge} className="rounded px-1.5 py-0 text-[0.65rem]">{status.label}</Badge>
              </Detail>
              <Detail label="Enterprise">{activity.enterprise}</Detail>
              <Detail label="Plant">{activity.plant}</Detail>
              <Detail label="Asset"><span className="font-medium">{activity.asset}</span></Detail>
              <Detail label="Assigned ELPREMAR">{activity.elpremar}</Detail>
              <Detail label="Scheduled Date / Time">
                <span className="tabular-nums">{activity.scheduled}</span>
                <span className="block text-[0.65rem] tabular-nums text-muted-foreground">{slotLabel(activity.slot)}</span>
              </Detail>
              <Detail label="Priority">
                <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[detail.priority])}>{detail.priority}</span>
              </Detail>
              <Detail label="Assigned / Created By">{detail.createdBy}</Detail>
              <Detail label="Task Description" className="col-span-2 sm:col-span-3">
                <span className="text-muted-foreground">{detail.description}</span>
              </Detail>
            </div>
          </SectionCard>

          {/* ---------- What the ELPREMAR executed ---------- */}
          <SectionCard title="Maintenance Execution" icon={<Zap className="size-4 text-primary" />} hoverable={false}>
            {execution ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <Detail label="Performed By">
                  <span className="font-medium">{execution.performedBy}</span>
                  {execution.performedBy !== activity.elpremar ? (
                    <span className="block text-[0.65rem] text-attention">Differs from the assigned ELPREMAR</span>
                  ) : null}
                </Detail>
                <Detail label="Mode of Operation">
                  <Badge
                    variant={execution.mode.startsWith("Offline") ? "warning" : "info"}
                    className="rounded px-1.5 py-0 text-[0.65rem]"
                  >
                    {execution.mode}
                  </Badge>
                </Detail>
                <Detail label="Actual Start Time"><span className="tabular-nums">{execution.startedAt}</span></Detail>
                <Detail label="Actual End Time">
                  {execution.endedAt ? (
                    <span className="tabular-nums">{execution.endedAt}</span>
                  ) : (
                    <span className="text-muted-foreground">Still in progress</span>
                  )}
                </Detail>
                <Detail label="Completion Notes" className="col-span-2 sm:col-span-3">
                  <span className="text-muted-foreground">{execution.notes}</span>
                </Detail>
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">Work has not started yet.</p>
            )}
          </SectionCard>

          {/* ---------- Consumables ---------- */}
          <SectionCard title="INSTA Products Used" icon={<Package className="size-4 text-primary" />} hoverable={false}>
            {detail.products.length ? (
              <ul className="divide-y divide-foreground/10 text-xs">
                {detail.products.map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{p.quantity} {p.unit}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-3 text-center text-xs text-muted-foreground">No products recorded against this activity.</p>
            )}
          </SectionCard>

          {/* ---------- Add-on activities ---------- */}
          <SectionCard title="Additional Activities" icon={<ShieldCheck className="size-4 text-primary" />} hoverable={false}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg p-3 ring-1 ring-foreground/10">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Flame className="size-3.5 text-critical" /> Fire Prevention System
                </div>
                {detail.firePrevention ? (
                  <div className="mt-2 space-y-2">
                    <Detail label="System">{detail.firePrevention.system}</Detail>
                    <Detail label="Remarks"><span className="text-muted-foreground">{detail.firePrevention.remarks}</span></Detail>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Not performed</p>
                )}
              </div>
              <div className="rounded-lg p-3 ring-1 ring-foreground/10">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Zap className="size-3.5 text-attention" /> Partial Discharge Mitigation
                </div>
                {detail.pdMitigation ? (
                  <div className="mt-2 space-y-2">
                    <Detail label="Method">{detail.pdMitigation.method}</Detail>
                    <Detail label="Remarks"><span className="text-muted-foreground">{detail.pdMitigation.remarks}</span></Detail>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Not performed</p>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ---------- Evidence ---------- */}
          <SectionCard title="Evidence & Attachments" icon={<ImageIcon className="size-4 text-primary" />} hoverable={false}>
            <EvidenceGallery items={detail.evidence} />
          </SectionCard>
        </div>

        {/* ---------- Sidebar ---------- */}
        <div className="space-y-4">
          <SectionCard title="Asset Details" icon={<MapPin className="size-4 text-primary" />} hoverable={false}>
            <div className="space-y-2.5">
              <Detail label="Asset ID"><span className="tabular-nums">{detail.assetTag}</span></Detail>
              <Detail label="Asset Name"><span className="font-medium">{activity.asset}</span></Detail>
              <Detail label="Location">{detail.area}</Detail>
              <Detail label="Asset Criticality">
                <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", criticalityTone[detail.assetCriticality])}>
                  {detail.assetCriticality}
                </span>
              </Detail>
              <Detail label="Commission Date"><span className="tabular-nums">{detail.commissionedOn}</span></Detail>
              <Detail label="Asset Category">{detail.assetCategory}</Detail>
            </div>
          </SectionCard>

          <SectionCard title="Approval" icon={<CheckCheck className="size-4 text-primary" />} hoverable={false}>
            {review ? (
              <div className="space-y-2.5">
                <Detail label="Outcome">
                  <Badge variant={review.outcome === "approved" ? "highlight" : "critical"} className="rounded px-1.5 py-0 text-[0.65rem]">
                    {review.outcome === "approved" ? "Approved" : "Correction requested"}
                  </Badge>
                </Detail>
                <Detail label="Reviewed By">{review.by}</Detail>
                <Detail label="Reviewed At"><span className="tabular-nums">{review.at}</span></Detail>
                <Detail label="Approval Remarks"><span className="text-muted-foreground">{review.remarks}</span></Detail>
                <p className="border-t pt-2.5 text-[0.7rem] text-muted-foreground">
                  {narrative(activity.status, activity.elpremar, activity.plant, execution)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {narrative(activity.status, activity.elpremar, activity.plant, execution)}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className={cn(control, "flex-1 bg-card")}
                title="View the booking, reassign it or approve it"
                onClick={() =>
                  setReassigning({
                    id: activity.id,
                    title: activity.asset,
                    subtitle: `${activity.type} · ${activity.plant}, ${activity.enterprise}`,
                    plant: activity.plant,
                    elpremar: activity.elpremar,
                    date: activity.scheduled,
                    slot: activity.slot,
                  })
                }
              >
                <Eye className="size-3.5" /> View
              </Button>
              {pendingApproval ? (
                <Button size="sm" className={cn(control, "flex-1")} onClick={() => submitReview("approved", "")}>
                  <CheckCheck className="size-3.5" /> Approve
                </Button>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Activity & Approval Timeline" hoverable={false}>
            <Timeline steps={timeline} />
          </SectionCard>
        </div>
      </div>

      {/* Reassign and approval both happen in a modal, as on the dashboard */}
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
