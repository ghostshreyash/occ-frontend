import { useCallback, useState } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isValid, parseISO } from "date-fns"
import {
  ArrowLeft,
  Ban,
  Building2,
  CircleCheck,
  Factory,
  Folder,
  MapPin,
  Network,
  Plus,
  Search,
  KeyRound,
  Server,
  X,
} from "lucide-react"

import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SelectField, TextareaField, TextField } from "@/components/form/fields"
import { DepartmentFields, PlantFields } from "@/components/form/entity-fields"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { StatCard } from "@/components/common/stat-card"
import { DetailSection, ValueGrid } from "@/components/common/detail-section"
import { SelectableTable } from "@/components/common/selectable-table"
import { ErrorNotice } from "@/components/common/data-state"
import { countries, indianStates } from "@/data/mock"
import { sectorLabelFor, sectorTypes, sectorsFor } from "@/data/master-data"
import {
  getEnterprise,
  setEnterpriseStatus,
  updateDepartment,
  updateEnterprise,
  updatePlant,
  type ApiDepartmentProfile,
  type ApiPlantProfile,
} from "@/lib/api/enterprises"
import { resolveLocationIds } from "@/lib/api/locations"
import { messageFor, useResource } from "@/lib/api/use-resource"
import { POSTAL_CODE_MAX_LENGTH } from "@/lib/validation"
import {
  departmentSchema,
  enterpriseSchema,
  locationSchema,
  plantSchema,
  type DepartmentValues,
  type LocationValues,
  type PlantValues,
} from "./enterprise-onboarding/schemas"

const th = "h-8 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"

/** Not served by the API yet - an empty cell rather than a plausible number */
const NOT_SERVED = "—"

/** ISO date in state, readable date on screen */
const showDate = (iso?: string) => {
  if (!iso) return undefined
  const d = parseISO(iso)
  return isValid(d) ? format(d, "dd MMM yyyy") : iso
}

/**
 * The Enterprise section edits what the API stores.
 *
 * `accessOption` and `logo` are dropped from the onboarding schema here: there
 * is no column for either (see `src/lib/api/enterprises.ts`), so a required
 * Access Options field would make the section unsaveable the moment it is read
 * back empty. Both are still asked for during onboarding, where they drive
 * which login a plant is given.
 */
const enterpriseFormSchema = enterpriseSchema.omit({ accessOption: true, logo: true })
type EnterpriseFormValues = z.infer<typeof enterpriseFormSchema>

/** Which section is being saved, so its footer says so and locks */
type Section = "enterprise" | "location" | "plant" | "department"

/**
 * Why a control that writes is turned off.
 *
 * Adding a plant, a department or a sub-department, and editing a plant's own
 * login, all need endpoints the API does not have: `/plants` and
 * `/departments` accept PATCH only, and nothing creates a plant login. The
 * controls stay visible and say why rather than disappearing, so it is clear
 * this is a missing API and not a permission.
 */
const NO_CREATE_ENDPOINT = "Not available yet: the API has no endpoint for this."

/** Enterprise detail: the full onboarding profile, editable, plus its work history */
export function EnterpriseDetailPage() {
  const { id = "" } = useParams()

  const [editing, setEditing] = useState<string | null>(null)
  /** Which section is being saved, so its footer says so and locks */
  const [saving, setSaving] = useState<Section | null>(null)
  /** Which plant, and which of its departments, the drill-down is showing */
  const [plantId, setPlantId] = useState<string>()
  const [deptId, setDeptId] = useState<string>()
  const [plantQuery, setPlantQuery] = useState("")
  const [plantCity, setPlantCity] = useState("all")

  /*
   * One read for the whole page: `GET /enterprises/{id}` carries the enterprise,
   * every plant under it, and each plant's departments with their
   * sub-departments nested - which is exactly the tree this screen drills
   * through. A save PATCHes one record and re-reads, so what is on screen is
   * what the server stored and no local copy can drift from it.
   */
  const read = useCallback(() => getEnterprise(id), [id])
  const { data: profile, error, loading, reload } = useResource(read)

  const plants = profile?.plants ?? []
  const plantCities = [...new Set(plants.map((pl) => pl.city).filter(Boolean))].sort()

  const visiblePlants = plants.filter((pl) => {
    if (plantCity !== "all" && pl.city !== plantCity) return false
    const q = plantQuery.trim().toLowerCase()
    if (!q) return true
    return [pl.name, pl.code, pl.type, pl.head, pl.city, pl.state]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  })

  /* The selection follows the filter: if the chosen plant is filtered out, fall back to the first visible one */
  const plant = visiblePlants.find((pl) => pl.id === plantId) ?? visiblePlants[0]
  const departments = plant?.departments ?? []
  const dept = departments.find((d) => d.id === deptId) ?? departments[0]
  const subs = dept?.subDepartments ?? []

  const enterpriseForm = useForm<EnterpriseFormValues>({
    resolver: zodResolver(enterpriseFormSchema),
    values: profile?.enterprise,
  })
  const locationForm = useForm<LocationValues>({ resolver: zodResolver(locationSchema), values: profile?.location })
  const plantForm = useForm<PlantValues>({ resolver: zodResolver(plantSchema), values: plant })
  const departmentForm = useForm<DepartmentValues>({ resolver: zodResolver(departmentSchema), values: dept })

  /**
   * Saves one section.
   *
   * Each section is its own record on the API, so each has its own route: the
   * enterprise and its head office are both `PATCH /enterprises/{id}`, a plant
   * is `PATCH /plants/{id}` and a department `PATCH /departments/{id}`. The
   * selected row is the one written, and a failure leaves the form open with
   * the values still in it.
   */
  const save =
    <T extends FieldValues>(form: UseFormReturn<T>, section: Section) =>
    () => {
      void form.handleSubmit(async (values) => {
        setSaving(section)
        try {
          if (section === "enterprise") {
            const v = values as unknown as EnterpriseFormValues
            await updateEnterprise(id, {
              name: v.name,
              shortName: v.shortName?.trim() || undefined,
              enterpriseType: v.sectorType,
              industry: v.sector,
              website: v.website?.trim() || null,
              description: v.description?.trim() || null,
            })
          } else if (section === "location") {
            const v = values as unknown as LocationValues
            /* The record stores the names; the ids go alongside when the
               location lists can resolve them. */
            const ids = await resolveLocationIds(v.country, v.state)
            await updateEnterprise(id, {
              country: v.country,
              state: v.state,
              city: v.city,
              address: v.address,
              postalCode: v.pin?.trim() || null,
              countryId: ids.countryId ?? null,
              stateId: ids.stateId ?? null,
            })
          } else if (section === "plant") {
            if (!plant) return
            await updatePlant(plant.id, values as unknown as Partial<ApiPlantProfile>)
          } else {
            if (!dept) return
            await updateDepartment(dept.id, values as unknown as Partial<ApiDepartmentProfile>)
          }
          setEditing(null)
          reload()
          toast.success("Saved")
        } catch (e) {
          toast.error("Could not save", { description: messageFor(e), duration: 10_000 })
        } finally {
          setSaving(null)
        }
      })()
    }

  if (!profile) {
    return (
      <div className="space-y-3">
        <PageHeader
          title={loading ? "Loading enterprise…" : "Enterprise not found"}
          breadcrumbs={[
            { label: "Enterprises", to: "/enterprises" },
            { label: loading ? "Loading" : "Not found" },
          ]}
        />
        {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
        {loading ? null : (
          <SectionCard title="Nothing here">
            <p className="text-xs text-muted-foreground">
              No enterprise matches that ID.{" "}
              <Link to="/enterprises" className="text-primary hover:underline">Back to Enterprises</Link>
            </p>
          </SectionCard>
        )}
      </div>
    )
  }

  const { enterprise: e, location: l } = profile
  const editingCountryIsIndia = locationForm.watch("country") === "India"
  const departmentCount = plants.reduce((n, pl) => n + pl.departments.length, 0)
  const subDepartmentCount = plants.reduce(
    (n, pl) => n + pl.departments.reduce((m, d) => m + d.subDepartments.length, 0),
    0
  )

  /*
   * Deactivation stops the enterprise using the app; the record and its history
   * stay. This is the one write on the page that is not a section edit, so it
   * re-reads on its own rather than through `save`.
   */
  const active = profile.status === "active"
  const toggleAccount = async () => {
    const next = active ? "inactive" : "active"
    try {
      await setEnterpriseStatus(id, next)
      reload()
      toast.success(next === "active" ? `${e.name} reactivated` : `${e.name} deactivated`, {
        description:
          next === "active"
            ? "They can sign in again."
            : "They can no longer sign in. Nothing has been deleted.",
      })
    } catch (err) {
      toast.error("Could not change the account status", { description: messageFor(err), duration: 10_000 })
    }
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={e.name}
        description={`${e.sectorType} · ${e.sector} · ${l.city}, ${l.country}`}
        breadcrumbs={[{ label: "Enterprises", to: "/enterprises" }, { label: e.name }]}
        actions={
          <>
            {/* The one status the API knows: whether the account may be used.
                Asset health used to sit beside it and has no endpoint. */}
            <Badge variant={active ? "success" : "neutral"} className="rounded px-1.5 py-0 text-[0.65rem]">
              {active ? "Active" : "Inactive"}
            </Badge>
            <Button size="sm" className="h-7 text-xs" disabled title={NO_CREATE_ENDPOINT}>
              <Plus className="size-3.5" /> Add Plant
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-7 text-xs", active && "text-critical")}
              onClick={() => void toggleAccount()}
            >
              {active ? <><Ban className="size-3.5" /> Deactivate</> : <><CircleCheck className="size-3.5" /> Reactivate</>}
            </Button>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link to="/enterprises"><ArrowLeft className="size-3.5" /> Back to Enterprises</Link>
            </Button>
          </>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}

      {/*
        Counted off the tree the API returned. The three asset-health bands that
        used to sit here were read from the mock; there is no asset endpoint, so
        the structure of the enterprise is what can honestly be summarised.
      */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Plants" value={plants.length} icon={Factory} tone="success" variant="plain" />
        <StatCard label="Departments" value={departmentCount} icon={Network} tone="info" variant="plain" />
        <StatCard label="Sub-departments" value={subDepartmentCount} icon={Folder} tone="highlight" variant="plain" />
        <StatCard
          label="Assets Monitored"
          value={NOT_SERVED}
          icon={Server}
          tone="neutral"
          variant="plain"
          footer={<span className="text-[0.65rem] text-muted-foreground">No asset endpoint yet</span>}
        />
      </div>

      {/* Full onboarding profile, section by section, editable in place */}
      <SectionCard title="Enterprise Profile" hoverable={false} contentClassName="space-y-2.5 px-3 pb-3">
        <DetailSection
          icon={Building2}
          title="Enterprise"
          sectionKey="enterprise"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(enterpriseForm, "enterprise")}
          saveLabel={saving === "enterprise" ? "Saving…" : "Save"}
          view={
            <ValueGrid
              rows={[
                { label: "Enterprise ID", value: profile.id },
                { label: "Enterprise Name", value: e.name },
                { label: "Short Name", value: e.shortName },
                { label: "Type", value: e.sectorType },
                { label: sectorLabelFor(e.sectorType), value: e.sector },
                { label: "Website", value: e.website },
                { label: "Onboarded", value: profile.onboarded },
                { label: "Description", value: e.description },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              <TextField control={enterpriseForm.control} name="name" label="Enterprise Name" required className="md:col-span-2" />
              <TextField control={enterpriseForm.control} name="shortName" label="Short Name" />
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
              {/* Access Options is collected during onboarding, where it decides
                  which login a plant is given, but the API has no column for it
                  - so it cannot be read back or changed here. */}
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
          saveLabel={saving === "location" ? "Saving…" : "Save"}
          view={
            <ValueGrid
              rows={[
                { label: "Country", value: l.country },
                { label: "State", value: l.state },
                { label: "City", value: l.city },
                { label: "Postal Code", value: l.pin },
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
              <TextField control={locationForm.control} name="pin" label="Postal Code (PIN)" maxLength={POSTAL_CODE_MAX_LENGTH} />
            </form>
          }
        />

        {/*
          The administrator account.

          `GET /enterprises/{id}` carries no account at all, and there is no
          endpoint to change one: `POST /users` creates a login (which is what
          onboarding uses) and nothing updates it. So this reads as a section
          waiting on an API rather than an editable one - the alternative was a
          form that looks editable and silently discards what is typed.
        */}
        <DetailSection
          icon={Building2}
          title="Enterprise Administrator Account"
          sectionKey="account"
          editing={editing}
          onEditingChange={setEditing}
          readOnlyNote="The API does not serve or update the administrator account yet. It is created during onboarding."
          view={
            <div className="space-y-2">
              <ValueGrid
                rows={[
                  { label: "Email ID", value: undefined },
                  { label: "Role", value: "Enterprise Admin" },
                  // Credentials are never echoed back, even to an owner
                  { label: "Password", value: "••••••••" },
                ]}
              />
              <p className="rounded-md bg-muted/40 p-2.5 text-[0.7rem] text-muted-foreground">
                Passwords are managed by the enterprise. They set one at first sign-in and can reset it
                themselves afterwards; OCC never sets or reads it. To stop this account being used,
                deactivate the enterprise.
              </p>
            </div>
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
          saveLabel={saving === "plant" ? "Saving…" : "Save"}
          view={
            <div className="space-y-2.5">
              {/* Search and location filter, so a 12-plant enterprise stays navigable */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1 sm:max-w-56">
                  <Label htmlFor="plant-search" className="sr-only">Search plants</Label>
                  <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="plant-search"
                    type="search"
                    value={plantQuery}
                    onChange={(ev) => setPlantQuery(ev.target.value)}
                    placeholder="Search name, code, type, head"
                    className="h-7 pl-7 text-xs"
                  />
                </div>

                <Select value={plantCity} onValueChange={setPlantCity}>
                  <SelectTrigger size="sm" aria-label="Filter by location" className="h-7 w-40 text-xs">
                    <MapPin className="size-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start" avoidCollisions={false}>
                    <SelectItem value="all">All Locations</SelectItem>
                    {plantCities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {plantQuery.trim() !== "" || plantCity !== "all" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setPlantQuery("")
                      setPlantCity("all")
                    }}
                  >
                    <X className="size-3.5" /> Clear
                  </Button>
                ) : null}

                <span className="ml-auto text-[0.7rem] tabular-nums text-muted-foreground">
                  {visiblePlants.length} of {plants.length}
                </span>
              </div>

              <SelectableTable
                rows={visiblePlants}
                selectedId={plantId}
                onSelect={(id) => {
                  setPlantId(id)
                  setDeptId(undefined)
                }}
                empty="No plants match these filters"
                columns={[
                  { key: "name", label: "Plant", render: (r) => <span className="font-medium">{r.name}</span> },
                  { key: "code", label: "Code", render: (r) => <span className="tabular-nums">{r.code}</span> },
                  {
                    key: "city",
                    label: "Location",
                    render: (r) => (
                      <span>
                        <span className="block">{r.city}</span>
                        <span className="block text-[0.65rem] text-muted-foreground">{r.state}</span>
                      </span>
                    ),
                  },
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
                      { label: "Plant Code", value: plant.code },
                      { label: "Plant Type", value: plant.type },
                      { label: "Plant Head", value: [plant.salutation, plant.head].filter(Boolean).join(" ") },
                      { label: "Email", value: plant.email },
                      { label: "Phone Number", value: [plant.phoneCode, plant.phone].filter(Boolean).join(" ") },
                      { label: "Plant Capacity", value: [plant.capacity, plant.capacityUnit].filter(Boolean).join(" ") },
                      { label: "Commissioning Date", value: showDate(plant.commissioningDate) },
                      { label: "Time Zone", value: plant.timeZone },
                      { label: "Plant Address", value: plant.address },
                      /* The plant's own coordinates - work is dispatched here, not to the head office */
                      { label: "Latitude", value: plant.latitude },
                      { label: "Longitude", value: plant.longitude },
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
              <PlantFields form={plantForm} />
            </form>
          }
        />

        {/*
          The plant's own login.

          Nothing on the API carries it: a plant row has no login columns and
          there is no endpoint that issues one for a plant, so this cannot be
          read back or created. The section says so rather than offering a form
          whose contents would go nowhere.
        */}
        <DetailSection
          icon={KeyRound}
          title={`Plant Manager — ${plant?.name ?? "no plant selected"}`}
          optional
          sectionKey="plant-manager"
          editing={editing}
          onEditingChange={setEditing}
          readOnlyNote={NO_CREATE_ENDPOINT}
          view={
            <p className="text-xs text-muted-foreground">
              A plant login cannot be issued or read yet — the API has no endpoint for one. Until it
              does, a plant is reached through the enterprise administrator account.
            </p>
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
          saveLabel={saving === "department" ? "Saving…" : "Save"}
          action={
            /* An existing department can be edited (PATCH /departments/{id});
               creating one needs a POST the API does not have. */
            plant ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[0.7rem]"
                disabled
                title={NO_CREATE_ENDPOINT}
              >
                <Plus className="size-3" /> Add Department
              </Button>
            ) : null
          }
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
              <DepartmentFields form={departmentForm} />
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
          readOnlyNote={NO_CREATE_ENDPOINT}
          action={
            dept ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[0.7rem]"
                disabled
                title={NO_CREATE_ENDPOINT}
              >
                <Plus className="size-3" /> Add Sub-department
              </Button>
            ) : null
          }
          view={
            <div className="space-y-2.5">
              {subs.length === 0 ? (
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
                      <TableHead className={th}>Function</TableHead>
                      <TableHead className={`${th} hidden sm:table-cell`}>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s, i) => (
                      <TableRow key={s.id}>
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
              )}
            </div>
          }
        />

      </SectionCard>

    </div>
  )
}

