import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import {
  ArrowLeft,
  CheckCheck,
  History,
  LifeBuoy,
  Link2,
  Paperclip,
  Play,
} from "lucide-react"
import { cn } from "cn"

import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { Detail, EvidenceGallery, Timeline } from "@/components/common/detail-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ticketTimeline } from "@/data/ticket-detail"
import {
  addTicketAttachment, findTicket, keepTicketInProgress, resolveAndCloseTicket,
  useTicketDetails, useTicketRows,
} from "@/data/ticket-store"
import { priorityTone } from "@/data/occ-tables"
import { useAuth } from "@/lib/auth/context"
import { capabilitiesFor, isTerminal } from "@/lib/auth/ticket-access"
import { control } from "@/lib/data-table"
import { workStatus } from "@/lib/status"

/** A contextual record the ticket came from, linked where that screen exists */
function Reference({ label, value, to }: { label: string; value?: string; to?: string }) {
  if (!value) return null
  return (
    <Detail label={label}>
      {to ? (
        <Link to={to} className="font-medium tabular-nums text-primary hover:underline">{value}</Link>
      ) : (
        <span className="font-medium tabular-nums">{value}</span>
      )}
    </Detail>
  )
}

export function SupportTicketDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const rows = useTicketRows()
  const details = useTicketDetails()
  const ticket = findTicket(id)
  const detail = id ? details[id] : undefined
  const caps = capabilitiesFor(user)

  // Seeded from any resolution already on record, so a resolved ticket reads back
  const [note, setNote] = useState(() => (id ? details[id]?.resolution?.summary ?? "" : ""))

  // `rows` is read so the page re-renders when the store changes
  void rows

  if (!ticket || !detail) {
    return (
      <div>
        <PageHeader title="Support Ticket" breadcrumbs={[{ label: "Support Tickets", to: "/support-tickets" }, { label: id ?? "Unknown" }]} />
        <SectionCard title="Not found" hoverable={false}>
          <p className="py-6 text-center text-xs text-muted-foreground">
            No support ticket with id <span className="font-medium text-foreground">{id}</span>.{" "}
            <Link to="/support-tickets" className="text-primary hover:underline">Back to the list</Link>
          </p>
        </SectionCard>
      </div>
    )
  }

  const status = workStatus[ticket.status]
  const timeline = ticketTimeline(detail)
  const by = user?.name ? `${user.name} (OCC)` : "Admin (OCC)"
  const closed = isTerminal(ticket)
  const hasReferences = !!(ticket.assetId || ticket.inspectionId || ticket.maintenanceId || ticket.reportId)

  /** Keep it on the desk: moves Open → In Progress, or logs a progress note */
  const doKeepInProgress = () => {
    keepTicketInProgress(ticket.id, note, by)
    toast.success(
      ticket.status === "in_progress" ? `Progress noted on ${ticket.id}` : `${ticket.id} moved to In Progress`
    )
  }

  /** The resolution and the closure land together — one step, both events logged */
  const doResolveAndClose = () => {
    if (!note.trim()) return
    resolveAndCloseTicket(ticket.id, note.trim(), by)
    toast.success(`${ticket.id} closed`, { description: note.trim() })
  }

  const attach = (files: FileList | null) => {
    const names = Array.from(files ?? []).map((f) => f.name)
    if (!names.length) return
    addTicketAttachment(ticket.id, names, user?.name ?? "Admin")
    toast.success(names.length > 1 ? `${names.length} files attached` : `${names[0]} attached`)
  }

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        breadcrumbs={[{ label: "Support Tickets", to: "/support-tickets" }, { label: ticket.id }]}
        actions={
          <Button variant="outline" size="sm" className={control} onClick={() => navigate("/support-tickets")}>
            <ArrowLeft className="size-3.5" /> Back to list
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {/* ---------- Ticket Information + Description ---------- */}
          <SectionCard title="Ticket Information" icon={<LifeBuoy className="size-4 text-primary" />} hoverable={false}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Detail label="Ticket #"><span className="font-medium tabular-nums">{ticket.id}</span></Detail>
              <Detail label="Subject" className="col-span-1 sm:col-span-2">
                <span className="font-medium">{ticket.subject}</span>
              </Detail>
              <Detail label="Enterprise">{ticket.enterprise}</Detail>
              <Detail label="Plant">{ticket.plant}</Detail>
              <Detail label="Category">{ticket.category}</Detail>
              <Detail label="Priority">
                <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[ticket.priority])}>{ticket.priority}</span>
              </Detail>
              <Detail label="Status">
                <Badge variant={status.badge} className="rounded px-1.5 py-0 text-[0.65rem]">{status.label}</Badge>
              </Detail>
              <Detail label="Source / Module">{ticket.source}</Detail>
              <Detail label="Raised By">{ticket.raisedBy}</Detail>
              <Detail label="Raised Date"><span className="tabular-nums">{ticket.raised}</span></Detail>
              <Detail label="Last Updated"><span className="tabular-nums">{ticket.lastUpdated}</span></Detail>
            </div>

            <div className="mt-4 border-t pt-3">
              <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Description</div>
              <p className="mt-1 text-xs text-muted-foreground">{detail.description}</p>
            </div>

            {/* Resolution is captured on the ticket, so it reads with the rest of the record */}
            {detail.resolution ? (
              <div className="mt-3 border-t pt-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  <Detail label="Resolved By">{detail.resolution.by}</Detail>
                  <Detail label="Resolved Date"><span className="tabular-nums">{detail.resolution.at}</span></Detail>
                </div>
                <div className="mt-3">
                  <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Resolution Note</div>
                  <p className="mt-1 text-xs text-muted-foreground">{detail.resolution.summary}</p>
                </div>
              </div>
            ) : null}

          </SectionCard>

          {/* ---------- Related EVITA Context ---------- */}
          {hasReferences ? (
            <SectionCard title="Related EVITA Context" icon={<Link2 className="size-4 text-primary" />} hoverable={false}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                <Reference label="Digital Asset ID" value={ticket.assetId} />
                <Reference
                  label="Inspection ID"
                  value={ticket.inspectionId}
                  to={ticket.inspectionId && `/inspection-activity-details/${ticket.inspectionId}`}
                />
                <Reference
                  label="Maintenance Activity ID"
                  value={ticket.maintenanceId}
                  to={ticket.maintenanceId && `/maintenance-activity-details/${ticket.maintenanceId}`}
                />
                <Reference label="Report ID" value={ticket.reportId} />
              </div>
              <p className="mt-3 text-[0.7rem] text-muted-foreground">
                Carried across automatically when the ticket was raised from {ticket.source}.
              </p>
            </SectionCard>
          ) : null}

          {/* ---------- Attachments ---------- */}
          <SectionCard
            title={`Attachments (${detail.attachments.length})`}
            icon={<Paperclip className="size-4 text-primary" />}
            hoverable={false}
          >
            <EvidenceGallery items={detail.attachments} empty="No attachments on this ticket." />

            {!closed ? (
              <div className="mt-3 border-t pt-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-info-soft px-3 py-2 text-xs font-medium text-primary hover:bg-accent">
                  <Paperclip className="size-3.5" /> Add Attachment
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/png,image/jpeg"
                    className="sr-only"
                    onChange={(e) => { attach(e.target.files); e.target.value = "" }}
                  />
                </label>
                <span className="ml-3 text-[0.7rem] text-muted-foreground">PDF, JPG, PNG (Max 5 MB)</span>
              </div>
            ) : null}
          </SectionCard>

        </div>

        {/* ---------- Side rail: Actions, then the one history ---------- */}
        <div className="space-y-4">
          <SectionCard title="Actions" icon={<CheckCheck className="size-4 text-primary" />} hoverable={false}>
            {closed ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                This ticket is closed. Its history below is kept for traceability.
              </p>
            ) : !caps.changeStatus ? (
              <p className="py-2 text-center text-xs text-muted-foreground">
                Your role can comment on this ticket but not change its status.
              </p>
            ) : (
              <div>
                <Label htmlFor="resolution-note" className="text-xs">
                  Resolution <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="resolution-note"
                  rows={5}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Steps taken to resolve this ticket..."
                  className="mt-1.5 text-xs"
                />
                {/* <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
                  Recorded against the ticket with your name and the time, and shown to {ticket.raisedBy}.
                </p> */}

                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(control, "bg-card")}
                    title="Leave the ticket open and keep working it"
                    onClick={doKeepInProgress}
                  >
                    <Play className="size-3.5" /> Keep In Progress
                  </Button>
                  <Button
                    size="sm"
                    className={control}
                    disabled={!note.trim() || !caps.close}
                    title={caps.close ? "Record the resolution and close" : "Your role cannot close tickets"}
                    onClick={doResolveAndClose}
                  >
                    <CheckCheck className="size-3.5" /> Close Ticket
                  </Button>
                </div>

                <p className="mt-2 text-[0.7rem] text-muted-foreground">
                  Open → In Progress → Closed.
                </p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Lifecycle / Activity History" icon={<History className="size-4 text-primary" />} hoverable={false}>
            <Timeline steps={timeline} />
          </SectionCard>
        </div>
      </div>

    </div>
  )
}
