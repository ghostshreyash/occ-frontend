import { useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Building2,
  Check,
  Factory,
  HardHat,
  LifeBuoy,
  MapPin,
  Pencil,
  Server,
  Wrench,
  X,
} from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SelectField, TextareaField, TextField } from "@/components/form/fields"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { StatCard } from "@/components/common/stat-card"
import { countries } from "@/data/mock"
import { healthBandFor, sectorTypes, sectorsFor } from "@/data/master-data"
import {
  activitiesFor,
  enterpriseRecords,
  priorityTone,
  ticketsFor,
  type EnterpriseRecord,
} from "@/data/occ-tables"
import { healthStatus, workStatus } from "@/lib/status"
import { optionalEmail, required } from "@/lib/validation"

const th = "h-8 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"

/** Only the onboarding fields that belong to the enterprise record itself */
const profileSchema = z.object({
  name: required("Enterprise name"),
  sectorType: required("Sector"),
  sector: required("Sector value"),
  country: required("Country"),
  city: required("City"),
  contactEmail: optionalEmail,
  notes: z.string().optional(),
})
type ProfileValues = z.infer<typeof profileSchema>

const onboardingBadge = { label: "Onboarded", badge: "neutral" as const }
const statusMeta = (s: EnterpriseRecord["status"]) => (s === "onboarding" ? onboardingBadge : healthStatus[s])

/** A labelled value in the read-only profile grid */
function Value({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.65rem] text-muted-foreground">{label}</dt>
      <dd className="truncate text-xs font-medium">{children || "—"}</dd>
    </div>
  )
}

/** Health score pill, coloured by the specification's bands */
function HealthPill({ score }: { score: number }) {
  const band = healthBandFor(score)
  const tone =
    band.tone === "healthy"
      ? "bg-healthy-soft text-healthy-soft-foreground"
      : band.tone === "attention"
        ? "bg-attention-soft text-attention-soft-foreground"
        : "bg-critical-soft text-critical-soft-foreground"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums", tone)}>
      {score}
      <span className="font-normal opacity-75">{band.label}</span>
    </span>
  )
}

/** Enterprise detail: the onboarding profile (editable) plus its work history */
export function EnterpriseDetailPage() {
  const { id } = useParams()
  const record = enterpriseRecords.find((e) => e.id === id)
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState<ProfileValues | null>(null)

  const activities = useMemo(() => (record ? activitiesFor(record.id) : []), [record])
  const tickets = useMemo(() => (record ? ticketsFor(record.id) : []), [record])

  const current: ProfileValues | undefined = record && {
    name: record.name,
    sectorType: record.sectorType,
    sector: record.sector,
    country: record.country,
    city: record.city,
    contactEmail: "",
    notes: "",
    ...profile,
  }

  const form = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), values: current })
  const watchedSectorType = form.watch("sectorType")

  if (!record || !current) {
    return (
      <div className="space-y-3">
        <PageHeader title="Enterprise not found" breadcrumbs={[{ label: "Enterprises", to: "/enterprises" }, { label: "Not found" }]} />
        <SectionCard title="Nothing here">
          <p className="text-xs text-muted-foreground">
            No enterprise matches that ID.{" "}
            <Link to="/enterprises" className="text-primary hover:underline">Back to Enterprises</Link>
          </p>
        </SectionCard>
      </div>
    )
  }

  const save = form.handleSubmit((values) => {
    // TODO: PATCH /enterprises/:id once the API exists
    setProfile(values)
    setEditing(false)
  })

  const openTickets = tickets.filter((t) => t.status !== "closed").length
  const completedWork = activities.filter((a) => a.status === "completed").length

  return (
    <div className="space-y-3">
      <PageHeader
        title={current.name}
        description={`${current.sectorType} · ${current.sector} · ${current.city}, ${current.country}`}
        breadcrumbs={[{ label: "Enterprises", to: "/enterprises" }, { label: current.name }]}
        actions={
          <>
            <Badge variant={statusMeta(record.status).badge} className="rounded px-1.5 py-0 text-[0.65rem]">
              {statusMeta(record.status).label}
            </Badge>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link to="/enterprises"><ArrowLeft className="size-3.5" /> Back to Enterprises</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <StatCard label="Plants" value={record.plants} icon={Factory} tone="success" variant="plain" />
        <StatCard label="Assets Monitored" value={record.assets} icon={Server} tone="info" variant="plain" />
        <StatCard label="ELPREMARs" value={record.elpremars} icon={HardHat} tone="highlight" variant="plain" />
        <StatCard label="Work Completed" value={completedWork} icon={Wrench} tone="healthy" variant="plain" />
        <StatCard label="Open Tickets" value={openTickets} icon={LifeBuoy} tone={openTickets > 0 ? "attention" : "neutral"} variant="plain" />
      </div>

      {/* Onboarding profile, editable in place */}
      <SectionCard
        title="Enterprise Profile"
        hoverable={false}
        actions={
          editing ? (
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[0.7rem]" onClick={() => { form.reset(current); setEditing(false) }}>
                <X className="size-3" /> Cancel
              </Button>
              <Button type="button" size="sm" className="h-6 text-[0.7rem]" onClick={save}>
                <Check className="size-3" /> Save
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="h-6 text-[0.7rem]" onClick={() => setEditing(true)}>
              <Pencil className="size-3" /> Edit
            </Button>
          )
        }
      >
        {editing ? (
          <form onSubmit={save} className="grid gap-2.5 md:grid-cols-3" noValidate>
            <TextField control={form.control} name="name" label="Enterprise Name" required className="md:col-span-2" />
            <SelectField
              control={form.control}
              name="sectorType"
              label="Sector"
              required
              options={sectorTypes}
              onValueChange={() => form.setValue("sector", "")}
            />
            <SelectField
              control={form.control}
              name="sector"
              label={watchedSectorType === "Retail" ? "Retail Sector" : "Industry Sector"}
              required
              options={sectorsFor(watchedSectorType)}
              disabled={!watchedSectorType}
            />
            <SelectField control={form.control} name="country" label="Country" required options={countries} />
            <TextField control={form.control} name="city" label="City" required />
            <TextField control={form.control} name="contactEmail" label="Contact Email" type="email" />
            <TextareaField control={form.control} name="notes" label="Notes" rows={2} className="md:col-span-3" />
          </form>
        ) : (
          <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
            <Value label="Enterprise ID">{record.id}</Value>
            <Value label="Enterprise Name">{current.name}</Value>
            <Value label="Sector">{current.sectorType}</Value>
            <Value label={current.sectorType === "Retail" ? "Retail Sector" : "Industry Sector"}>{current.sector}</Value>
            <Value label="Country">{current.country}</Value>
            <Value label="City">{current.city}</Value>
            <Value label="Onboarded">{record.onboarded}</Value>
            <Value label="Contact Email">{current.contactEmail}</Value>
            <Value label="Notes">{current.notes}</Value>
          </dl>
        )}
      </SectionCard>

      {/* History */}
      <Tabs defaultValue="maintenance" className="rounded-lg bg-card shadow-xs ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2.5">
          <TabsList className="h-7 gap-0.5">
            <TabsTrigger value="maintenance" className="px-2 text-xs">
              <Wrench className="size-3.5" />
              Maintenance History
              <span className="rounded bg-foreground/8 px-1 text-[0.62rem] font-semibold tabular-nums">{activities.length}</span>
            </TabsTrigger>
            <TabsTrigger value="tickets" className="px-2 text-xs">
              <LifeBuoy className="size-3.5" />
              Support Tickets
              <span className="rounded bg-foreground/8 px-1 text-[0.62rem] font-semibold tabular-nums">{tickets.length}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="overflow-x-auto px-1 pb-2">
          <TabsContent value="maintenance">
            {activities.length === 0 ? (
              <Empty icon={Wrench} title="No maintenance recorded yet" hint="Work carried out at this enterprise will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className={th}>ID</TableHead>
                    <TableHead className={th}>Date</TableHead>
                    <TableHead className={th}>Asset / Plant</TableHead>
                    <TableHead className={`${th} hidden md:table-cell`}>Type</TableHead>
                    <TableHead className={`${th} hidden lg:table-cell`}>ELPREMAR</TableHead>
                    <TableHead className={th}>Health</TableHead>
                    <TableHead className={th}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className={`${td} font-medium text-primary`}>{a.id}</TableCell>
                      <TableCell className={`${td} tabular-nums`}>{a.date}</TableCell>
                      <TableCell className={td}>
                        <div className="font-medium">{a.asset}</div>
                        <div className="text-[0.65rem] text-muted-foreground">{a.plant}</div>
                      </TableCell>
                      <TableCell className={`${td} hidden md:table-cell`}>{a.type}</TableCell>
                      <TableCell className={`${td} hidden lg:table-cell`}>{a.elpremar}</TableCell>
                      <TableCell className={td}>
                        {a.healthBefore !== undefined ? (
                          <span className="flex items-center gap-1">
                            <HealthPill score={a.healthBefore} />
                            {a.healthAfter !== undefined ? (
                              <>
                                <span className="text-muted-foreground">→</span>
                                <HealthPill score={a.healthAfter} />
                              </>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-[0.65rem] text-muted-foreground">Not assessed</span>
                        )}
                      </TableCell>
                      <TableCell className={td}>
                        <Badge variant={workStatus[a.status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">
                          {workStatus[a.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="tickets">
            {tickets.length === 0 ? (
              <Empty icon={LifeBuoy} title="No support tickets" hint="Tickets raised by this enterprise will appear here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead className={th}>Ticket</TableHead>
                    <TableHead className={th}>Raised</TableHead>
                    <TableHead className={th}>Subject</TableHead>
                    <TableHead className={`${th} hidden md:table-cell`}>Category</TableHead>
                    <TableHead className={th}>Priority</TableHead>
                    <TableHead className={th}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className={`${td} font-medium text-primary`}>#{t.id}</TableCell>
                      <TableCell className={`${td} tabular-nums`}>{t.raised}</TableCell>
                      <TableCell className={`${td} max-w-72 whitespace-normal`}>{t.subject}</TableCell>
                      <TableCell className={`${td} hidden md:table-cell`}>{t.category}</TableCell>
                      <TableCell className={td}>
                        <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[t.priority])}>{t.priority}</span>
                      </TableCell>
                      <TableCell className={td}>
                        <Badge variant={workStatus[t.status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">
                          {workStatus[t.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </div>
      </Tabs>

      <SectionCard title="Asset Health" hoverable={false}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-44 flex-1">
            <div className="mb-1 flex items-center justify-between text-[0.7rem]">
              <span className="text-muted-foreground">Overall health across {record.assets.toLocaleString("en-IN")} assets</span>
              <span className="font-semibold tabular-nums">{record.status === "critical" ? 48 : record.status === "attention" ? 64 : 86}/100</span>
            </div>
            <Progress
              value={record.status === "critical" ? 48 : record.status === "attention" ? 64 : 86}
              className="h-2 [&>[data-slot=progress-indicator]]:bg-healthy"
            />
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
            <MapPin className="size-3.5" />
            {record.plants} plants · {current.city}, {current.country}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

/** Shared empty state for the history tabs */
function Empty({ icon: Icon, title, hint }: { icon: typeof Building2; title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}
