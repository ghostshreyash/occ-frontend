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
  LifeBuoy,
  MapPin,
  Network,
  HeartPulse,
  Server,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateField, PasswordField, PhoneField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { StatCard } from "@/components/common/stat-card"
import { DetailSection, ValueGrid } from "@/components/common/detail-section"
import { SelectableTable } from "@/components/common/selectable-table"
import { WorkSummaryCard } from "@/components/common/work-summary-card"
import { countries, indianStates, salutations, timeZones } from "@/data/mock"
import { departmentTypes, plantCapacityUnitCodes, sectorLabelFor, sectorTypes, sectorsFor, userRoles } from "@/data/master-data"
import {
  assetHealthFor,
  enterpriseRecords,
  profileFor,
  supportTickets,
  type DepartmentProfile,
  type EnterpriseProfile,
  type EnterpriseRecord,
  type PlantProfile,
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

/**
 * Account editor. The current password is never loaded, only replaced - leave the
 * new-password fields blank to change the username or role on their own.
 */
const accountFormSchema = z
  .object({
    email: z.email("Enter a valid email address"),
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
  /** Which plant, and which of its departments, the drill-down is showing */
  const [plantId, setPlantId] = useState<string>()
  const [deptId, setDeptId] = useState<string>()

  const base = useMemo(() => (record ? profileFor(record) : undefined), [record])
  const profile = base ? { ...base, ...overrides } : undefined
  const tickets = useMemo(() => (record ? supportTickets.filter((s) => s.enterprise === record.name) : []), [record])

  const plants = profile?.plants ?? []
  // The first plant is selected until another is picked; its first department likewise
  const plant = plants.find((p) => p.id === plantId) ?? plants[0]
  const departments = plant?.departments ?? []
  const dept = departments.find((d) => d.id === deptId) ?? departments[0]
  const subs = dept?.subDepartments ?? []

  const enterpriseForm = useForm<EnterpriseValues>({ resolver: zodResolver(enterpriseSchema), values: profile?.enterprise })
  const locationForm = useForm<LocationValues>({ resolver: zodResolver(locationSchema), values: profile?.location })
  const plantForm = useForm<PlantValues>({ resolver: zodResolver(plantSchema), values: plant })
  const departmentForm = useForm<DepartmentValues>({ resolver: zodResolver(departmentSchema), values: dept })

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    values: profile ? { email: profile.account.email, role: profile.account.role, newPassword: "", confirmPassword: "" } : undefined,
  })

  /**
   * Writes a section's form back into the profile. Plant and department edits
   * land on the selected row, not on a single top-level object.
   */
  const save =
    <T extends FieldValues>(form: UseFormReturn<T>, key: "enterprise" | "location" | "plant" | "department") =>
    () => {
      void form.handleSubmit((values) => {
        // TODO: PATCH /enterprises/:id once the API exists
        setOverrides((o) => {
          if (key === "plant" || key === "department") {
            const next = (o.plants ?? plants).map((pl) =>
              pl.id !== plant?.id
                ? pl
                : key === "plant"
                  ? { ...pl, ...(values as Partial<PlantProfile>) }
                  : {
                      ...pl,
                      departments: pl.departments.map((d) =>
                        d.id === dept?.id ? { ...d, ...(values as Partial<DepartmentProfile>) } : d
                      ),
                    }
            )
            return { ...o, plants: next }
          }
          return { ...o, [key]: values }
        })
        setEditing(null)
      })()
    }


  const saveAccount = accountForm.handleSubmit((values) => {
    // The password is write-only: it is never read back, only replaced
    setOverrides((o) => ({
      ...o,
      account: { ...(profile?.account ?? { email: "", role: "", lastLogin: "" }), email: values.email, role: values.role },
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

  const { enterprise: e, location: l, account } = profile
  const editingCountryIsIndia = locationForm.watch("country") === "India"
  const openTickets = tickets.filter((t) => t.status !== "closed").length
  const health = assetHealthFor(record)
  const pct = (n: number) => Math.round((n / record.assets) * 100)

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
        <StatCard label="Open Tickets" value={openTickets} icon={LifeBuoy} tone={openTickets > 0 ? "attention" : "neutral"} variant="plain" />
        {/* Asset health split, using the platform's three bands */}
        <StatCard label="Healthy Assets" value={health.healthy} percent={pct(health.healthy)} icon={HeartPulse} tone="healthy" variant="plain" />
        <StatCard label="Attention Required" value={health.attention} percent={pct(health.attention)} icon={TriangleAlert} tone="attention" variant="plain" />
        <StatCard label="Poor Condition" value={health.critical} percent={pct(health.critical)} icon={ShieldAlert} tone="critical" variant="plain" />
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
              <TextareaField control={locationForm.control} name="address" label="Address (Head Office)" required rows={2} maxLength={250} className="md:col-span-2" />
              <TextField control={locationForm.control} name="pin" label="Postal Code (PIN)" required />
              <TextField control={locationForm.control} name="latitude" label="Latitude" inputMode="decimal" />
              <TextField control={locationForm.control} name="longitude" label="Longitude" inputMode="decimal" />
            </form>
          }
        />

        {/* Plants: an enterprise has many, so pick one and drill down */}
        <DetailSection
          icon={Factory}
          title={`Plants (${plants.length})`}
          step={3}
          complete={plants.length > 0}
          summary={plant ? `${plant.name} selected` : undefined}
          sectionKey="plant"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(plantForm, "plant")}
          view={
            <div className="space-y-2.5">
              <SelectableTable
                rows={plants}
                selectedId={plantId}
                onSelect={(id) => {
                  setPlantId(id)
                  setDeptId(undefined)
                }}
                empty="No plants registered"
                columns={[
                  { key: "name", label: "Plant", render: (r) => <span className="font-medium">{r.name}</span> },
                  { key: "code", label: "Code", render: (r) => <span className="tabular-nums">{r.code}</span> },
                  { key: "type", label: "Type", hideBelow: "md", render: (r) => r.type },
                  { key: "head", label: "Plant Head", hideBelow: "lg", render: (r) => `${r.salutation} ${r.head}` },
                  { key: "cap", label: "Capacity", hideBelow: "sm", render: (r) => `${r.capacity} ${r.capacityUnit}` },
                  { key: "dept", label: "Depts", align: "right", render: (r) => <span className="tabular-nums">{r.departments.length}</span> },
                ]}
              />

              {plant ? (
                <div className="rounded-md bg-muted/30 p-2.5">
                  <p className="mb-2 text-[0.62rem] tracking-wide text-muted-foreground uppercase">Selected plant</p>
                  <ValueGrid
                    rows={[
                      { label: "Plant Name", value: plant.name },
                      { label: "Plant Type", value: plant.type },
                      { label: "Plant Code", value: plant.code },
                      { label: "Plant Head", value: [plant.salutation, plant.head].filter(Boolean).join(" ") },
                      { label: "Email", value: plant.email },
                      { label: "Phone Number", value: [plant.phoneCode, plant.phone].filter(Boolean).join(" ") },
                      { label: "Plant Capacity", value: [plant.capacity, plant.capacityUnit].filter(Boolean).join(" ") },
                      { label: "Commissioning Date", value: showDate(plant.commissioningDate) },
                      { label: "Time Zone", value: plant.timeZone },
                      { label: "Plant Address", value: plant.address },
                      { label: "Notes", value: plant.notes },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              <p className="text-[0.7rem] text-muted-foreground md:col-span-3">
                Editing <strong>{plant?.name}</strong>
              </p>
              <TextField control={plantForm.control} name="name" label="Plant Name" required />
              <TextField control={plantForm.control} name="type" label="Plant Type" required />
              <TextField control={plantForm.control} name="code" label="Plant Code" />
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                <SelectField control={plantForm.control} name="salutation" label="Title" required options={salutations} />
                <TextField control={plantForm.control} name="head" label="Plant Head" required />
              </div>
              <TextField control={plantForm.control} name="email" label="Email" required type="email" />
              <PhoneField control={plantForm.control} codeName="phoneCode" name="phone" label="Phone Number" required />
              <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
                <TextField control={plantForm.control} name="capacity" label="Plant Capacity" inputMode="decimal" />
                <SelectField control={plantForm.control} name="capacityUnit" label="Unit" options={plantCapacityUnitCodes} placeholder="Unit" />
              </div>
              <DateField control={plantForm.control} name="commissioningDate" label="Commissioning Date" />
              <SelectField control={plantForm.control} name="timeZone" label="Time Zone" options={timeZones} />
              <TextareaField control={plantForm.control} name="address" label="Plant Address" required rows={2} maxLength={250} className="md:col-span-3" />
              <TextareaField control={plantForm.control} name="notes" label="Notes" rows={2} className="md:col-span-3" />
            </form>
          }
        />

        {/* Departments belong to the selected plant */}
        <DetailSection
          icon={Network}
          title={`Departments — ${plant?.name ?? "no plant selected"}`}
          step={4}
          complete={departments.length > 0}
          optional
          summary={dept ? `${dept.name} selected` : undefined}
          sectionKey="department"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(departmentForm, "department")}
          view={
            <div className="space-y-2.5">
              <SelectableTable
                rows={departments}
                selectedId={deptId}
                onSelect={setDeptId}
                empty="No departments under this plant"
                columns={[
                  { key: "name", label: "Department", render: (r) => <span className="font-medium">{r.name}</span> },
                  { key: "code", label: "Code", render: (r) => <span className="tabular-nums">{r.code}</span> },
                  { key: "head", label: "Head", hideBelow: "md", render: (r) => `${r.salutation} ${r.head}` },
                  { key: "email", label: "Email", hideBelow: "lg", render: (r) => r.email },
                  { key: "subs", label: "Sub-depts", align: "right", render: (r) => <span className="tabular-nums">{r.subDepartments.length}</span> },
                ]}
              />

              {dept ? (
                <div className="rounded-md bg-muted/30 p-2.5">
                  <p className="mb-2 text-[0.62rem] tracking-wide text-muted-foreground uppercase">Selected department</p>
                  <ValueGrid
                    rows={[
                      { label: "Department Name", value: dept.name },
                      { label: "Department Code", value: dept.code },
                      { label: "Department Type", value: dept.type },
                      { label: "Parent Department", value: dept.parent },
                      { label: "Head of Department", value: [dept.salutation, dept.head].filter(Boolean).join(" ") },
                      { label: "Email", value: dept.email },
                      { label: "Phone Number", value: [dept.phoneCode, dept.phone].filter(Boolean).join(" ") },
                      { label: "Description", value: dept.description },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              <p className="text-[0.7rem] text-muted-foreground md:col-span-3">
                Editing <strong>{dept?.name}</strong> under <strong>{plant?.name}</strong>
              </p>
              <TextField control={departmentForm.control} name="name" label="Department Name" />
              <TextField control={departmentForm.control} name="code" label="Department Code" />
              <SelectField control={departmentForm.control} name="type" label="Department Type" options={departmentTypes} />
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                <SelectField control={departmentForm.control} name="salutation" label="Title" options={salutations} />
                <TextField control={departmentForm.control} name="head" label="Head of Department" />
              </div>
              <TextField control={departmentForm.control} name="email" label="Email" type="email" />
              <PhoneField control={departmentForm.control} codeName="phoneCode" name="phone" label="Phone Number" />
              <TextareaField control={departmentForm.control} name="description" label="Description" rows={2} className="md:col-span-3" />
            </form>
          }
        />

        {/* Sub-departments belong to the selected department */}
        <DetailSection
          icon={Folder}
          title={`Sub-departments — ${dept?.name ?? "no department selected"}`}
          step={5}
          complete={subs.length > 0}
          optional
          summary={subs.length > 0 ? subs.map((s) => s.name).join(", ") : undefined}
          sectionKey="subs"
          editing={editing}
          onEditingChange={setEditing}
          view={
            subs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {dept ? "No sub-departments under this department." : "Select a department to see its sub-departments."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className={th}>#</TableHead>
                      <TableHead className={th}>Name</TableHead>
                      <TableHead className={th}>Code</TableHead>
                      <TableHead className={th}>Function / Area</TableHead>
                      <TableHead className={`${th} hidden sm:table-cell`}>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s, i) => (
                      <TableRow key={s.code}>
                        <TableCell className={`${td} tabular-nums text-muted-foreground`}>{i + 1}</TableCell>
                        <TableCell className={`${td} font-medium`}>{s.name}</TableCell>
                        <TableCell className={`${td} tabular-nums`}>{s.code}</TableCell>
                        <TableCell className={td}>{s.function}</TableCell>
                        <TableCell className={`${td} hidden sm:table-cell`}>{s.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
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
                { label: "Email ID", value: account.email },
                { label: "Role", value: account.role },
                // Credentials are never echoed back, even to an owner
                { label: "Password", value: "••••••••" },
                { label: "Last Login", value: account.lastLogin },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-2" noValidate>
              <TextField control={accountForm.control} name="email" label="Email ID" required type="email" />
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


    </div>
  )
}

