import { useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isValid, parseISO } from "date-fns"
import {
  ArrowLeft,
  Building2,
  Factory,
  Folder,
  HardHat,
  LifeBuoy,
  MapPin,
  Network,
  Pencil,
  Plus,
  Server,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateField, PasswordField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { StatCard } from "@/components/common/stat-card"
import { DetailSection, ValueGrid } from "@/components/common/detail-section"
import { WorkSummaryCard } from "@/components/common/work-summary-card"
import { OperationsTables } from "@/components/common/operations-tables"
import { countries, indianStates, salutations, subDepartmentFunctions, timeZones } from "@/data/mock"
import { departmentTypes, sectorLabelFor, sectorTypes, sectorsFor, userRoles } from "@/data/master-data"
import {
  enterpriseRecords,
  maintenanceProgress,
  profileFor,
  supportTickets,
  type EnterpriseProfile,
  type EnterpriseRecord,
} from "@/data/occ-tables"
import { healthStatus } from "@/lib/status"
import { required } from "@/lib/validation"
import {
  departmentSchema,
  enterpriseSchema,
  locationSchema,
  plantSchema,
  type DepartmentValues,
  type EnterpriseValues,
  type LocationValues,
  type PlantValues,
} from "./enterprise-onboarding/schemas"

/** One sub-department row in the list editor */
const subRowSchema = z.object({
  name: required("Sub-department name"),
  code: required("Sub-department code"),
  function: required("Function / Area"),
  description: z.string().optional(),
})
type SubDepartmentRow = z.infer<typeof subRowSchema>

/**
 * Account editor. The current password is never loaded, only replaced - leave the
 * new-password fields blank to change the username or role on their own.
 */
const accountFormSchema = z
  .object({
    username: required("Username").refine((v) => v.trim().length >= 6, "Username must be at least 6 characters"),
    role: required("Role"),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((v) => !v.newPassword || v.newPassword.length >= 8, {
    message: "Password must be at least 8 characters",
    path: ["newPassword"],
  })
  .refine((v) => (v.newPassword ?? "") === (v.confirmPassword ?? ""), {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
type AccountFormValues = z.infer<typeof accountFormSchema>

const th = "h-8 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"

const onboardingBadge = { label: "Onboarded", badge: "neutral" as const }
const statusMeta = (s: EnterpriseRecord["status"]) => (s === "onboarding" ? onboardingBadge : healthStatus[s])

/** ISO date in state, readable date on screen */
const showDate = (iso?: string) => {
  if (!iso) return undefined
  const d = parseISO(iso)
  return isValid(d) ? format(d, "dd MMM yyyy") : iso
}

/** Enterprise detail: the full onboarding profile, editable, plus its work history */
export function EnterpriseDetailPage() {
  const { id } = useParams()
  const record = enterpriseRecords.find((e) => e.id === id)

  const [editing, setEditing] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<Partial<EnterpriseProfile>>({})
  /** Row being edited in the sub-department list, or null when adding a new one */
  const [subRow, setSubRow] = useState<number | null>(null)

  const base = useMemo(() => (record ? profileFor(record) : undefined), [record])
  const profile = base ? { ...base, ...overrides } : undefined

  // Counts for the KPI row come from the same rows the tables below render
  const activities = useMemo(() => (record ? maintenanceProgress.filter((m) => m.enterprise === record.name) : []), [record])
  const tickets = useMemo(() => (record ? supportTickets.filter((s) => s.enterprise === record.name) : []), [record])

  const enterpriseForm = useForm<EnterpriseValues>({ resolver: zodResolver(enterpriseSchema), values: profile?.enterprise })
  const locationForm = useForm<LocationValues>({ resolver: zodResolver(locationSchema), values: profile?.location })
  const plantForm = useForm<PlantValues>({ resolver: zodResolver(plantSchema), values: profile?.plant })
  const departmentForm = useForm<DepartmentValues>({ resolver: zodResolver(departmentSchema), values: profile?.department })

  const subForm = useForm<SubDepartmentRow>({
    resolver: zodResolver(subRowSchema),
    defaultValues: { name: "", code: "", function: "", description: "" },
  })
  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    values: profile ? { username: profile.account.username, role: profile.account.role, newPassword: "", confirmPassword: "" } : undefined,
  })

  const save =
    <T extends FieldValues>(form: UseFormReturn<T>, key: keyof EnterpriseProfile) =>
    () => {
      void form.handleSubmit((values) => {
        // TODO: PATCH /enterprises/:id once the API exists
        setOverrides((o) => ({ ...o, [key]: values }))
        setEditing(null)
      })()
    }

  /** Sub-department list edits write straight into the profile override */
  const writeSubs = (rows: SubDepartmentRow[]) => setOverrides((o) => ({ ...o, subDepartments: rows }))

  const commitSubRow = subForm.handleSubmit((values) => {
    const rows = [...(profile?.subDepartments ?? [])]
    if (subRow !== null) rows[subRow] = values
    else rows.push(values)
    writeSubs(rows)
    setSubRow(null)
    subForm.reset({ name: "", code: "", function: "", description: "" })
  })

  const saveAccount = accountForm.handleSubmit((values) => {
    // The password is write-only: it is never read back, only replaced
    setOverrides((o) => ({
      ...o,
      account: { ...(profile?.account ?? { username: "", role: "", lastLogin: "" }), username: values.username, role: values.role },
    }))
    accountForm.setValue("newPassword", "")
    accountForm.setValue("confirmPassword", "")
    setEditing(null)
  })

  if (!record || !profile) {
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

  const { enterprise: e, location: l, plant: p, department: d, subDepartments: subs, account } = profile
  const editingCountryIsIndia = locationForm.watch("country") === "India"
  const openTickets = tickets.filter((t) => t.status !== "closed").length
  const completedWork = activities.filter((a) => a.status === "completed").length
  const overallHealth = record.status === "critical" ? 48 : record.status === "attention" ? 64 : 86

  return (
    <div className="space-y-3">
      <PageHeader
        title={e.name}
        description={`${e.sectorType} · ${e.sector} · ${l.city}, ${l.country}`}
        breadcrumbs={[{ label: "Enterprises", to: "/enterprises" }, { label: e.name }]}
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

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Plants" value={record.plants} icon={Factory} tone="success" variant="plain" />
        <StatCard label="Assets Monitored" value={record.assets} icon={Server} tone="info" variant="plain" />
        <StatCard label="ELPREMARs" value={record.elpremars} icon={HardHat} tone="highlight" variant="plain" />
        <StatCard label="Work Completed" value={completedWork} icon={Wrench} tone="healthy" variant="plain" />
        <StatCard label="Open Tickets" value={openTickets} icon={LifeBuoy} tone={openTickets > 0 ? "attention" : "neutral"} variant="plain" />
        <StatCard label="Asset Health" value={`${overallHealth}%`} icon={ShieldCheck} tone="healthy" variant="plain" />
      </div>

      <WorkSummaryCard enterprise={e.name} />

      {/* Full onboarding profile, section by section, editable in place */}
      <SectionCard title="Enterprise Profile" hoverable={false} contentClassName="space-y-2.5 px-3 pb-3">
        <DetailSection
          icon={Building2}
          title="Enterprise"
          sectionKey="enterprise"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(enterpriseForm, "enterprise")}
          view={
            <ValueGrid
              rows={[
                { label: "Enterprise ID", value: record.id },
                { label: "Enterprise Name", value: e.name },
                { label: "Short Name", value: e.shortName },
                { label: "Type", value: e.sectorType },
                { label: sectorLabelFor(e.sectorType), value: e.sector },
                { label: "Website", value: e.website },
                { label: "Onboarded", value: record.onboarded },
                { label: "Description", value: e.description },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              <TextField control={enterpriseForm.control} name="name" label="Enterprise Name" required className="md:col-span-2" />
              <TextField control={enterpriseForm.control} name="shortName" label="Short Name" required />
              <SelectField
                control={enterpriseForm.control}
                name="sectorType"
                label="Type"
                required
                options={sectorTypes}
                onValueChange={() => enterpriseForm.setValue("sector", "")}
              />
              <SelectField
                control={enterpriseForm.control}
                name="sector"
                label={sectorLabelFor(enterpriseForm.watch("sectorType"))}
                required
                options={sectorsFor(enterpriseForm.watch("sectorType"))}
                disabled={!enterpriseForm.watch("sectorType")}
              />
              <TextField control={enterpriseForm.control} name="website" label="Website" />
              <TextareaField control={enterpriseForm.control} name="description" label="Description" rows={2} className="md:col-span-3" />
            </form>
          }
        />

        <DetailSection
          icon={MapPin}
          title="Location"
          sectionKey="location"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(locationForm, "location")}
          view={
            <ValueGrid
              rows={[
                { label: "Country", value: l.country },
                { label: "State", value: l.state },
                { label: "City", value: l.city },
                { label: "Postal Code", value: l.pin },
                { label: "Latitude", value: l.latitude },
                { label: "Longitude", value: l.longitude },
                { label: "Address", value: l.address },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              <SelectField control={locationForm.control} name="country" label="Country" required options={countries} />
              {editingCountryIsIndia ? (
                <SelectField control={locationForm.control} name="state" label="State" required options={indianStates} />
              ) : (
                <TextField control={locationForm.control} name="state" label="State / Province" required />
              )}
              <TextField control={locationForm.control} name="city" label="City" required />
              <TextField control={locationForm.control} name="pin" label="Postal Code (PIN)" required />
              <TextField control={locationForm.control} name="latitude" label="Latitude" required inputMode="decimal" />
              <TextField control={locationForm.control} name="longitude" label="Longitude" required inputMode="decimal" />
              <TextareaField control={locationForm.control} name="address" label="Address (Head Office)" required rows={2} maxLength={250} className="md:col-span-3" />
            </form>
          }
        />

        <DetailSection
          icon={Factory}
          title="Plant"
          sectionKey="plant"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(plantForm, "plant")}
          view={
            <ValueGrid
              rows={[
                { label: "Plant Name", value: p.name },
                { label: "Plant Type", value: p.type },
                { label: "Plant Code", value: p.code },
                { label: "Plant Head", value: [p.salutation, p.head].filter(Boolean).join(" ") },
                { label: "Email", value: p.email },
                { label: "Phone Number", value: p.phone },
                { label: "Plant Capacity", value: p.capacity },
                { label: "Commissioning Date", value: showDate(p.commissioningDate) },
                { label: "Time Zone", value: p.timeZone },
                { label: "Plant Address", value: p.address },
                { label: "Notes", value: p.notes },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              <TextField control={plantForm.control} name="name" label="Plant Name" required />
              <TextField control={plantForm.control} name="type" label="Plant Type" required />
              <TextField control={plantForm.control} name="code" label="Plant Code" />
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                <SelectField control={plantForm.control} name="salutation" label="Title" required options={salutations} />
                <TextField control={plantForm.control} name="head" label="Plant Head" required />
              </div>
              <TextField control={plantForm.control} name="email" label="Email" type="email" />
              <TextField control={plantForm.control} name="phone" label="Phone Number" type="tel" />
              <TextField control={plantForm.control} name="capacity" label="Plant Capacity" />
              <DateField control={plantForm.control} name="commissioningDate" label="Commissioning Date" />
              <SelectField control={plantForm.control} name="timeZone" label="Time Zone" options={timeZones} />
              <TextareaField control={plantForm.control} name="address" label="Plant Address" required rows={2} maxLength={250} className="md:col-span-3" />
              <TextareaField control={plantForm.control} name="notes" label="Notes" rows={2} className="md:col-span-3" />
            </form>
          }
        />

        <DetailSection
          icon={Network}
          title="Department"
          sectionKey="department"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(departmentForm, "department")}
          view={
            <ValueGrid
              rows={[
                { label: "Department Name", value: d.name },
                { label: "Department Code", value: d.code },
                { label: "Department Type", value: d.type },
                { label: "Parent Department", value: d.parent },
                { label: "Head of Department", value: d.head },
                { label: "Email", value: d.email },
                { label: "Phone Number", value: d.phone },
                { label: "Description", value: d.description },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              <TextField control={departmentForm.control} name="name" label="Department Name" />
              <TextField control={departmentForm.control} name="code" label="Department Code" />
              <SelectField control={departmentForm.control} name="type" label="Department Type" options={departmentTypes} />
              <TextField control={departmentForm.control} name="head" label="Head of Department" />
              <TextField control={departmentForm.control} name="email" label="Email" type="email" />
              <TextField control={departmentForm.control} name="phone" label="Phone Number" type="tel" />
              <TextareaField control={departmentForm.control} name="description" label="Description" rows={2} className="md:col-span-3" />
            </form>
          }
        />

        <DetailSection
          icon={Folder}
          title={`Sub-departments (${subs.length})`}
          sectionKey="subs"
          editing={editing}
          onEditingChange={(k) => {
            setEditing(k)
            setSubRow(null)
            subForm.reset({ name: "", code: "", function: "", description: "" })
          }}
          onSave={() => setEditing(null)}
          saveLabel="Done"
          view={<SubTable rows={subs} />}
          edit={
            <div className="space-y-2.5">
              <SubTable
                rows={subs}
                onEdit={(i) => {
                  setSubRow(i)
                  subForm.reset(subs[i])
                }}
                onRemove={(i) => writeSubs(subs.filter((_, n) => n !== i))}
              />

              <form onSubmit={commitSubRow} className="grid items-end gap-2.5 rounded-md bg-muted/40 p-2.5 md:grid-cols-[1fr_1fr_1fr_1.4fr_auto]" noValidate>
                <TextField control={subForm.control} name="name" label="Sub-department Name" required placeholder="e.g. HT Maintenance" />
                <TextField control={subForm.control} name="code" label="Code" required placeholder="e.g. SUB-EL-HT" />
                <SelectField control={subForm.control} name="function" label="Function / Area" required options={subDepartmentFunctions} />
                <TextField control={subForm.control} name="description" label="Description" />
                <div className="flex gap-1.5">
                  <Button type="submit" size="sm" className="h-8 text-xs">
                    {subRow !== null ? <><Pencil className="size-3.5" /> Update</> : <><Plus className="size-3.5" /> Add</>}
                  </Button>
                  {subRow !== null ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setSubRow(null)
                        subForm.reset({ name: "", code: "", function: "", description: "" })
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </form>
            </div>
          }
        />

        <DetailSection
          icon={Building2}
          title="Enterprise Administrator Account"
          sectionKey="account"
          editing={editing}
          onEditingChange={setEditing}
          onSave={saveAccount}
          view={
            <ValueGrid
              rows={[
                { label: "Username", value: account.username },
                { label: "Role", value: account.role },
                // Credentials are never echoed back, even to an owner
                { label: "Password", value: "••••••••" },
                { label: "Last Login", value: account.lastLogin },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-2" noValidate>
              <TextField control={accountForm.control} name="username" label="Username" required />
              <SelectField control={accountForm.control} name="role" label="Role" required options={userRoles} />
              <div className="md:col-span-2 rounded-md bg-muted/40 p-2.5">
                <p className="mb-2 text-[0.7rem] text-muted-foreground">
                  Leave blank to keep the current password. The existing password is never shown.
                </p>
                <div className="grid gap-2.5 md:grid-cols-2">
                  <PasswordField control={accountForm.control} name="newPassword" label="New Password" placeholder="At least 8 characters" />
                  <PasswordField control={accountForm.control} name="confirmPassword" label="Confirm New Password" />
                </div>
              </div>
            </form>
          }
        />
      </SectionCard>

      {/* Same tables as the dashboard, filtered to this enterprise */}
      <OperationsTables enterprise={e.name} />

      <SectionCard title="Asset Health" hoverable={false}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-44 flex-1">
            <div className="mb-1 flex items-center justify-between text-[0.7rem]">
              <span className="text-muted-foreground">Across {record.assets.toLocaleString("en-IN")} monitored assets</span>
              <span className="font-semibold tabular-nums">{overallHealth}/100</span>
            </div>
            <Progress value={overallHealth} className="h-2 [&>[data-slot=progress-indicator]]:bg-healthy" />
          </div>
          <div className="flex items-center gap-2 text-[0.65rem] text-muted-foreground">
            <MapPin className="size-3.5" />
            {record.plants} plants · {l.city}, {l.country}
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

/** Sub-department list; row actions appear only while the section is being edited */
function SubTable({
  rows,
  onEdit,
  onRemove,
}: {
  rows: { name: string; code: string; function: string; description?: string }[]
  onEdit?: (i: number) => void
  onRemove?: (i: number) => void
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">None added yet.</p>
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className={th}>#</TableHead>
            <TableHead className={th}>Name</TableHead>
            <TableHead className={th}>Code</TableHead>
            <TableHead className={th}>Function / Area</TableHead>
            <TableHead className={`${th} hidden sm:table-cell`}>Description</TableHead>
            {onEdit ? <TableHead className={`${th} w-20`}>Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s, i) => (
            <TableRow key={`${s.code}-${i}`}>
              <TableCell className={`${td} tabular-nums text-muted-foreground`}>{i + 1}</TableCell>
              <TableCell className={`${td} font-medium`}>{s.name}</TableCell>
              <TableCell className={td}>{s.code}</TableCell>
              <TableCell className={td}>{s.function}</TableCell>
              <TableCell className={`${td} hidden sm:table-cell`}>{s.description}</TableCell>
              {onEdit ? (
                <TableCell className="px-2 py-1.5">
                  <div className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="size-6" aria-label={`Edit ${s.name}`} onClick={() => onEdit(i)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="size-6 text-critical" aria-label={`Remove ${s.name}`} onClick={() => onRemove?.(i)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
