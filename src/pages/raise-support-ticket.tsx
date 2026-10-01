import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowLeft, Info, Paperclip, Send, X } from "lucide-react"
import { cn } from "cn"

import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { SelectField, TextareaField, TextField } from "@/components/form/fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  allSupportTickets, ticketCategories, ticketSources, type TicketCategory, type TicketSource, type Priority,
} from "@/data/occ-tables"
import { raiseTicket } from "@/data/ticket-store"
import { priorities } from "@/data/mock"
import { useAuth } from "@/lib/auth/context"
import { capabilitiesFor } from "@/lib/auth/ticket-access"
import { control } from "@/lib/data-table"
import { required } from "@/lib/validation"

const schema = z.object({
  enterprise: required("Enterprise"),
  plant: required("Plant"),
  subject: required("Subject"),
  description: required("Description"),
  category: required("Category"),
  priority: required("Priority"),
  source: required("Source / Module"),
  assetId: z.string().optional(),
  inspectionId: z.string().optional(),
  maintenanceId: z.string().optional(),
  reportId: z.string().optional(),
})
type TicketValues = z.infer<typeof schema>

/** Enterprise → plants → country, read off the ticket book so the pairs are real */
const sites = allSupportTickets.map((t) => ({ enterprise: t.enterprise, plant: t.plant, country: t.country }))
const enterpriseNames = [...new Set(sites.map((s) => s.enterprise))].sort()

export function RaiseSupportTicketPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const caps = capabilitiesFor(user)
  const [files, setFiles] = useState<string[]>([])

  /*
   * A ticket raised from inside a module arrives with its context on the query
   * string, e.g. /support-tickets/raise?source=Inspection&inspectionId=TSK-8840.
   * Those fields are pre-filled and shown as carried-over, so the reporter never
   * re-keys what the module already knew.
   */
  const carried = useMemo(
    () => ({
      source: (params.get("source") as TicketSource | null) ?? undefined,
      enterprise: params.get("enterprise") ?? undefined,
      plant: params.get("plant") ?? undefined,
      category: (params.get("category") as TicketCategory | null) ?? undefined,
      assetId: params.get("assetId") ?? undefined,
      inspectionId: params.get("inspectionId") ?? undefined,
      maintenanceId: params.get("maintenanceId") ?? undefined,
      reportId: params.get("reportId") ?? undefined,
    }),
    [params]
  )

  const fromModule = !!carried.source && carried.source !== "OCC Console"

  const form = useForm<TicketValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      enterprise: carried.enterprise ?? enterpriseNames[0],
      plant: carried.plant ?? "",
      subject: "",
      description: "",
      category: carried.category ?? "System",
      priority: "Medium",
      source: carried.source ?? "OCC Console",
      assetId: carried.assetId ?? "",
      inspectionId: carried.inspectionId ?? "",
      maintenanceId: carried.maintenanceId ?? "",
      reportId: carried.reportId ?? "",
    },
  })
  const { control: formControl, watch, setValue } = form

  const enterprise = watch("enterprise")
  const plant = watch("plant")
  const plantOptions = useMemo(
    () => [...new Set(sites.filter((s) => s.enterprise === enterprise).map((s) => s.plant))].sort(),
    [enterprise]
  )

  // Changing enterprise strands any plant that does not belong to it, which would
  // otherwise submit a pair that does not exist
  useEffect(() => {
    if (plant && !plantOptions.includes(plant)) setValue("plant", "")
  }, [plant, plantOptions, setValue])

  const submit = form.handleSubmit((values) => {
    const country = sites.find((s) => s.enterprise === values.enterprise && s.plant === values.plant)?.country ?? "India"
    // Ticket #, Raised By, Raised Date and Status = Open are set by the store
    const id = raiseTicket(
      {
        enterprise: values.enterprise,
        plant: values.plant,
        country,
        subject: values.subject,
        description: values.description,
        category: values.category as TicketCategory,
        priority: values.priority as Priority,
        source: values.source as TicketSource,
        assetId: values.assetId || undefined,
        inspectionId: values.inspectionId || undefined,
        maintenanceId: values.maintenanceId || undefined,
        reportId: values.reportId || undefined,
        attachments: files,
      },
      user?.name ?? "Admin"
    )
    toast.success(`${id} raised`, { description: `${values.category} · ${values.plant}` })
    navigate(`/support-ticket-details/${id}`)
  })

  if (!caps.raise) {
    return (
      <div>
        <PageHeader title="Raise Support Ticket" breadcrumbs={[{ label: "Support Tickets", to: "/support-tickets" }, { label: "Raise" }]} />
        <SectionCard title="Not permitted" hoverable={false}>
          <p className="py-6 text-center text-xs text-muted-foreground">
            Your role cannot raise support tickets.{" "}
            <Link to="/support-tickets" className="text-primary hover:underline">Back to the list</Link>
          </p>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Raise Support Ticket"
        breadcrumbs={[{ label: "Support Tickets", to: "/support-tickets" }, { label: "Raise Support Ticket" }]}
        actions={
          <Button variant="outline" size="sm" className={cn(control, "bg-card")} asChild>
            <Link to="/support-tickets"><ArrowLeft className="size-3.5" /> Back to Support Tickets</Link>
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <SectionCard title="Ticket Details" hoverable={false}>
          <p className="-mt-1 mb-4 text-xs text-muted-foreground">
            Describe the problem and where it happened. The ticket number, your name, the date and the
            Open status are added automatically.
          </p>

          {fromModule ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-info-soft p-2.5 text-xs">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <div className="font-medium text-primary">Raised from {carried.source}</div>
                <p className="mt-0.5 text-muted-foreground">
                  The context below came across with you and is attached to the ticket.
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {carried.enterprise ? <Badge variant="info" className="rounded px-1.5 py-0 text-[0.65rem]">{carried.enterprise}</Badge> : null}
                  {carried.plant ? <Badge variant="info" className="rounded px-1.5 py-0 text-[0.65rem]">{carried.plant}</Badge> : null}
                  {carried.assetId ? <Badge variant="info" className="rounded px-1.5 py-0 text-[0.65rem]">Asset {carried.assetId}</Badge> : null}
                  {carried.inspectionId ? <Badge variant="info" className="rounded px-1.5 py-0 text-[0.65rem]">Inspection {carried.inspectionId}</Badge> : null}
                  {carried.maintenanceId ? <Badge variant="info" className="rounded px-1.5 py-0 text-[0.65rem]">Maintenance {carried.maintenanceId}</Badge> : null}
                  {carried.reportId ? <Badge variant="info" className="rounded px-1.5 py-0 text-[0.65rem]">Report {carried.reportId}</Badge> : null}
                </div>
              </div>
            </div>
          ) : null}

          <form onSubmit={submit} className="grid gap-4 md:grid-cols-6" noValidate>
            <SelectField
              control={formControl}
              name="enterprise"
              label="Enterprise"
              required
              options={enterpriseNames}
              className="md:col-span-3"
            />
            <SelectField
              control={formControl}
              name="plant"
              label="Plant"
              required
              options={plantOptions}
              className="md:col-span-3"
            />
            <TextField control={formControl} name="subject" label="Subject" required className="md:col-span-6" />
            <TextareaField control={formControl} name="description" label="Description" required rows={4} className="md:col-span-6" />
            <SelectField control={formControl} name="category" label="Category" required options={[...ticketCategories]} className="md:col-span-2" />
            <SelectField control={formControl} name="priority" label="Priority" required options={[...priorities]} className="md:col-span-2" />
            <SelectField control={formControl} name="source" label="Source / Module" required options={[...ticketSources]} className="md:col-span-2" />

            <div className="md:col-span-6">
              <div className="mb-1 text-sm font-medium">Related Records <span className="text-xs font-normal text-muted-foreground">(optional)</span></div>
              <p className="mb-2 text-xs text-muted-foreground">
                Quote any record the ticket is about, so OCC can open it directly.
              </p>
              <div className="grid gap-4 md:grid-cols-4">
                <TextField control={formControl} name="assetId" label="Digital Asset ID" placeholder="AST-MUM-0142" />
                <TextField control={formControl} name="inspectionId" label="Inspection ID" placeholder="TSK-8840" />
                <TextField control={formControl} name="maintenanceId" label="Maintenance ID" placeholder="MT-2290" />
                <TextField control={formControl} name="reportId" label="Report ID" placeholder="RPT-MUN-2291" />
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="mb-2 text-sm font-medium">Attachments</div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-info-soft px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                <Paperclip className="size-4" /> Upload Files
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/png,image/jpeg"
                  className="sr-only"
                  onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? []).map((file) => file.name)])}
                />
              </label>
              <span className="ml-3 text-xs text-muted-foreground">PDF, JPG, PNG (Max 5 MB)</span>
              {files.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {files.map((name, i) => (
                    <li key={`${name}-${i}`}>
                      <Badge variant="neutral" className="gap-1 rounded px-1.5 py-0 text-[0.65rem]">
                        {name}
                        <button
                          type="button"
                          aria-label={`Remove ${name}`}
                          onClick={() => setFiles((f) => f.filter((_, n) => n !== i))}
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="flex justify-between gap-3 md:col-span-6">
              <Button
                type="button"
                variant="outline"
                className="min-w-24"
                onClick={() => { form.reset(); setFiles([]) }}
              >
                Clear
              </Button>
              <Button type="submit" className="min-w-36"><Send /> Raise Ticket</Button>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Set Automatically" hoverable={false}>
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            These are filled in when the ticket is created — nothing to enter.
          </p>
          <dl className="space-y-2.5 text-xs">
            {[
              ["Ticket #", "Next in the TK- sequence"],
              ["Raised By", user?.name ?? "Admin"],
              ["Raised Date", "Today"],
              ["Status", "Open"],
              ["Last Updated", "Time of creation"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                <dt className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                <dd className="text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[0.7rem] text-muted-foreground">
            Once raised, the ticket goes to the OCC desk to be assigned. You can follow it from the
            Support Tickets list.
          </p>
        </SectionCard>
      </div>
    </div>
  )
}
