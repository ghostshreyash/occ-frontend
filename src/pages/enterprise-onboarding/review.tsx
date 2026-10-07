import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, isValid, parseISO } from "date-fns"
import { Building2, Check, Factory, Folder, MapPin, Network, Pencil, Trash2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SelectField, TextareaField, TextField } from "@/components/form/fields"
import { DepartmentFields, PlantFields } from "@/components/form/entity-fields"
import { StepCard } from "@/components/common/wizard-layout"
import { DetailSection, ValueGrid } from "@/components/common/detail-section"
import { SelectableTable } from "@/components/common/selectable-table"
import { countries, indianStates } from "@/data/mock"
import { sectorLabelFor, sectorTypes, sectorsFor } from "@/data/master-data"
import {
  departmentSchema,
  enterpriseSchema,
  locationSchema,
  plantSchema,
  type DepartmentValues,
  type EnterpriseValues,
  type LocationValues,
  type OnboardingData,
  type PlantValues,
} from "./schemas"


/** ISO date in form state, readable date on screen */
/** Initials for the identity card */
const monogram = (name?: string) =>
  (name ?? "")
    .replace(/[^A-Za-z ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "NEW"

const formatDate = (iso?: string) => {
  if (!iso) return undefined
  const d = parseISO(iso)
  return isValid(d) ? format(d, "dd MMM yyyy") : iso
}

/** Wraps a section's fields in their own form so Enter and validation behave normally */
function SectionForm({ id, onSubmit, children }: { id: string; onSubmit: () => void; children: React.ReactNode }) {
  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="grid gap-2.5 md:grid-cols-3"
      noValidate
    >
      {children}
    </form>
  )
}

/**
 * Step 6: everything captured so far, in view mode, editable in place.
 * The footer submits the whole payload.
 */
export function ReviewStep({
  data,
  onBack,
  onChange,
  onSubmit,
  submitting,
  title = "Step 5 of 5: Review & Submit",
  submitLabel = "Submit Onboarding",
  /** Sections that belong to an enterprise that already exists, so they are read-only here */
  readOnly = [],
}: {
  data: OnboardingData
  onBack: () => void
  onChange: (patch: Partial<OnboardingData>) => void
  onSubmit: () => void
  submitting: boolean
  title?: string
  submitLabel?: string
  readOnly?: string[]
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [plantIndex, setPlantIndex] = useState(0)
  const [deptIndex, setDeptIndex] = useState(0)
  const { enterprise: e, location: l, plants, account } = data

  /* Removing a row in an earlier step can leave a selection pointing past the end */
  const currentPlant = Math.min(plantIndex, Math.max(0, plants.length - 1))
  const p = plants[currentPlant]
  const departments = p?.departments ?? []
  const currentDept = Math.min(deptIndex, Math.max(0, departments.length - 1))
  const d = departments[currentDept]
  const subs = d?.subDepartments ?? []

  const departmentCount = plants.reduce((n, pl) => n + pl.departments.length, 0)
  const subCount = plants.reduce((n, pl) => n + pl.departments.reduce((m, dd) => m + dd.subDepartments.length, 0), 0)

  const enterpriseForm = useForm<EnterpriseValues>({ resolver: zodResolver(enterpriseSchema), values: e })
  const locationForm = useForm<LocationValues>({ resolver: zodResolver(locationSchema), values: l })
  const plantForm = useForm<PlantValues>({ resolver: zodResolver(plantSchema), values: p })
  const departmentForm = useForm<DepartmentValues>({ resolver: zodResolver(departmentSchema), values: d })

  /** The enterprise card now covers the head office too, so saving it writes both records */
  const saveEnterpriseDetails = () => {
    void enterpriseForm.handleSubmit((enterprise) => {
      void locationForm.handleSubmit((location) => {
        onChange({ enterprise, location })
        setEditing(null)
      })()
    })()
  }

  /** Plant and department edits land on the selected row rather than on a single object */
  const savePlant = () => {
    void plantForm.handleSubmit((values) => {
      onChange({ plants: plants.map((pl, i) => (i === currentPlant ? { ...pl, ...values } : pl)) })
      setEditing(null)
    })()
  }
  const saveDepartment = () => {
    void departmentForm.handleSubmit((values) => {
      onChange({
        plants: plants.map((pl, i) =>
          i !== currentPlant
            ? pl
            : { ...pl, departments: pl.departments.map((dd, j) => (j === currentDept ? { ...dd, ...values } : dd)) }
        ),
      })
      setEditing(null)
    })()
  }
  const removeSub = (i: number) =>
    onChange({
      plants: plants.map((pl, n) =>
        n !== currentPlant
          ? pl
          : {
              ...pl,
              departments: pl.departments.map((dd, j) =>
                j === currentDept ? { ...dd, subDepartments: dd.subDepartments.filter((_, m) => m !== i) } : dd
              ),
            }
      ),
    })

  /* SelectableTable keys rows by id; onboarding rows are only ever positional */
  const plantRows = plants.map((pl, i) => ({ ...pl, id: String(i) }))
  const departmentRows = departments.map((dd, i) => ({ ...dd, id: String(i) }))

  const isIndia = locationForm.watch("country") === "India"

  /* Which sections carry data, so the header can report readiness honestly */
  const done = {
    enterprise: Boolean(e?.name) && Boolean(l?.city),
    plant: plants.length > 0,
    department: departmentCount > 0,
    subs: subCount > 0,
    account: Boolean(account?.email),
  }
  /* An enterprise being added to has no new account, so that section is not shown or counted */
  const hasAccount = account !== undefined
  const sections = hasAccount ? 5 : 4
  const completeCount = Object.values(done).filter(Boolean).length
  const emptyOptional = [done.department, done.subs].filter((v) => !v).length
  /** Sections carried over from an existing enterprise cannot be edited here */
  const editable = (key: string) => !readOnly.includes(key)

  return (
    <StepCard
      title={title}
      formId="step-review"
      nextLabel={submitLabel}
      nextIcon={<Check />}
      pending={submitting}
      onBack={onBack}
    >
      <form
        id="step-review"
        onSubmit={(ev) => {
          ev.preventDefault()
          onSubmit()
        }}
      />

      <div className="space-y-2.5">
        {/* Identity card: what is actually being created, at a glance */}
        <div className="overflow-hidden rounded-lg bg-brand-navy text-brand-navy-foreground ring-1 ring-foreground/10">
          <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/10 text-sm font-bold ring-1 ring-white/15">
              {monogram(e?.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{e?.name || "New enterprise"}</div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.7rem] text-brand-navy-foreground/75">
                {e?.sectorType ? <span className="rounded bg-white/10 px-1.5 py-0.5">{e.sectorType}</span> : null}
                {e?.sector ? <span>{e.sector}</span> : null}
                {l?.city ? <span className="flex items-center gap-1"><MapPin className="size-3" />{l.city}, {l.country}</span> : null}
              </div>
            </div>
            <dl className="flex gap-4 text-center">
              {[
                { label: plants.length === 1 ? "Plant" : "Plants", value: plants.length },
                { label: "Depts", value: departmentCount },
                { label: "Sub-depts", value: subCount },
              ].map((s) => (
                <div key={s.label}>
                  <dd className="text-base leading-none font-bold tabular-nums">{s.value}</dd>
                  <dt className="mt-0.5 text-[0.6rem] text-brand-navy-foreground/70">{s.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Readiness: required sections done, optional ones called out rather than hidden */}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-white/5 px-3 py-1.5 text-[0.7rem]">
            <span className="font-medium">
              {completeCount} of {sections} sections complete
            </span>
            <Progress
              value={(completeCount / sections) * 100}
              className="h-1.5 w-28 bg-white/15 [&>[data-slot=progress-indicator]]:bg-healthy"
            />
            <span className="text-brand-navy-foreground/70">
              {emptyOptional > 0
                ? `${emptyOptional} optional section${emptyOptional > 1 ? "s" : ""} left empty — that is fine`
                : "Everything filled in"}
            </span>
            <span className="ml-auto flex items-center gap-1 text-brand-navy-foreground/70">
              <Pencil className="size-3" /> Edit any section below
            </span>
          </div>
        </div>

        <DetailSection
          icon={Building2}
          title="Enterprise"
          step={1}
          complete={done.enterprise}
          summary={[e?.sectorType, e?.sector, l?.city].filter(Boolean).join(" · ")}
          sectionKey="enterprise"
          editing={editing}
          onEditingChange={setEditing}
          onSave={saveEnterpriseDetails}
          readOnlyNote={editable("enterprise") ? undefined : "Set when this enterprise was onboarded — it cannot be changed here."}
          view={
            <ValueGrid
              rows={[
                { label: "Enterprise Name", value: e?.name },
                { label: "Short Name", value: e?.shortName },
                { label: "Type", value: e?.sectorType },
                { label: sectorLabelFor(e?.sectorType), value: e?.sector },
                { label: "Website", value: e?.website },
                { label: "Country", value: l?.country },
                { label: "State", value: l?.state },
                { label: "City", value: l?.city },
                { label: "Postal Code", value: l?.pin },
                { label: "Address (Head Office)", value: l?.address, wide: true },
                { label: "Description", value: e?.description, wide: true },
              ]}
            />
          }
          edit={
            editable("enterprise") ? (
            <SectionForm id="edit-enterprise" onSubmit={saveEnterpriseDetails}>
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

              <h4 className="mt-1 text-xs font-semibold md:col-span-3">Head Office</h4>
              <SelectField control={locationForm.control} name="country" label="Country" required options={countries} />
              {isIndia ? (
                <SelectField control={locationForm.control} name="state" label="State" required options={indianStates} />
              ) : (
                <TextField control={locationForm.control} name="state" label="State / Province" required />
              )}
              <TextField control={locationForm.control} name="city" label="City" required />
              <TextareaField control={locationForm.control} name="address" label="Address (Head Office)" required rows={2} maxLength={250} className="md:col-span-2" />
              <TextField control={locationForm.control} name="pin" label="Postal Code (PIN)" required />
            </SectionForm>
            ) : undefined
          }
        />

        <DetailSection
          icon={Factory}
          title={`Plants (${plants.length})`}
          step={2}
          complete={done.plant}
          summary={p ? `${p.name} selected` : undefined}
          sectionKey="plant"
          editing={editing}
          onEditingChange={setEditing}
          onSave={savePlant}
          view={
            <div className="space-y-2.5">
              <SelectableTable
                rows={plantRows}
                selectedId={String(currentPlant)}
                onSelect={(id) => {
                  setPlantIndex(Number(id))
                  setDeptIndex(0)
                }}
                empty="No plants added — go back to step 3 to add one"
                columns={[
                  { key: "name", label: "Plant", render: (r) => <span className="font-medium">{r.name}</span> },
                  { key: "code", label: "Code", render: (r) => <span className="tabular-nums">{r.code}</span> },
                  { key: "type", label: "Type", render: (r) => r.type },
                  { key: "city", label: "City", hideBelow: "md", render: (r) => r.city },
                  { key: "head", label: "Plant Head", hideBelow: "lg", render: (r) => `${r.salutation} ${r.head}` },
                  { key: "dept", label: "Depts", align: "right", render: (r) => <span className="tabular-nums">{r.departments.length}</span> },
                ]}
              />

              {p ? (
                <div className="rounded-md bg-muted/30 p-2.5">
                  <p className="mb-2 text-[0.62rem] tracking-wide text-muted-foreground uppercase">Selected plant</p>
                  <ValueGrid
                    rows={[
                      { label: "Plant Name", value: p.name },
                      { label: "Plant Type", value: p.type },
                      { label: "Plant Code", value: p.code },
                      { label: "Plant Head", value: [p.salutation, p.head].filter(Boolean).join(" ") },
                      { label: "Email", value: p.email },
                      { label: "Phone Number", value: [p.phoneCode, p.phone].filter(Boolean).join(" ") },
                      { label: "Capacity", value: [p.capacity, p.capacityUnit].filter(Boolean).join(" ") },
                      { label: "Commissioning Date", value: formatDate(p.commissioningDate) },
                      { label: "Time Zone", value: p.timeZone },
                      { label: "Postal Code", value: p.pin },
                      { label: "City", value: p.city },
                      { label: "Latitude", value: p.latitude },
                      { label: "Longitude", value: p.longitude },
                      { label: "Address", value: p.address },
                      { label: "Notes", value: p.notes },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          }
          edit={
            p ? (
              <SectionForm id="edit-plant" onSubmit={savePlant}>
                <p className="text-[0.7rem] text-muted-foreground md:col-span-3">
                  Editing <strong>{p.name}</strong>
                </p>
                <PlantFields form={plantForm} />
              </SectionForm>
            ) : undefined
          }
        />

        <DetailSection
          icon={Network}
          title={`Departments — ${p?.name ?? "no plant selected"}`}
          step={3}
          complete={done.department}
          optional
          summary={d ? `${d.name} selected` : undefined}
          sectionKey="department"
          editing={editing}
          onEditingChange={setEditing}
          onSave={saveDepartment}
          view={
            <div className="space-y-2.5">
              <SelectableTable
                rows={departmentRows}
                selectedId={String(currentDept)}
                onSelect={(id) => setDeptIndex(Number(id))}
                empty={p ? `No departments under ${p.name} — this section is optional` : "Select a plant first"}
                columns={[
                  { key: "name", label: "Department", render: (r) => <span className="font-medium">{r.name}</span> },
                  { key: "code", label: "Code", render: (r) => <span className="tabular-nums">{r.code}</span> },
                  { key: "type", label: "Type", hideBelow: "md", render: (r) => r.type },
                  { key: "head", label: "Head", hideBelow: "lg", render: (r) => `${r.salutation} ${r.head}` },
                  { key: "subs", label: "Sub-depts", align: "right", render: (r) => <span className="tabular-nums">{r.subDepartments.length}</span> },
                ]}
              />

              {d ? (
                <div className="rounded-md bg-muted/30 p-2.5">
                  <p className="mb-2 text-[0.62rem] tracking-wide text-muted-foreground uppercase">Selected department</p>
                  <ValueGrid
                    rows={[
                      { label: "Department Name", value: d.name },
                      { label: "Department Code", value: d.code },
                      { label: "Type", value: d.type },
                      { label: "Parent Department", value: d.parent },
                      { label: "Head of Department", value: [d.salutation, d.head].filter(Boolean).join(" ") },
                      { label: "Email", value: d.email },
                      { label: "Phone Number", value: [d.phoneCode, d.phone].filter(Boolean).join(" ") },
                      { label: "Description", value: d.description },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          }
          edit={
            d ? (
              <SectionForm id="edit-department" onSubmit={saveDepartment}>
                <p className="text-[0.7rem] text-muted-foreground md:col-span-3">
                  Editing <strong>{d.name}</strong> under <strong>{p?.name}</strong>
                </p>
                <DepartmentFields form={departmentForm} />
              </SectionForm>
            ) : undefined
          }
        />

        {/* Sub-departments are a list, so rows are removed here rather than re-keyed into a form */}
        <DetailSection
          icon={Folder}
          title={`Sub-departments — ${d?.name ?? "no department selected"}`}
          step={4}
          complete={done.subs}
          optional
          summary={subs.length > 0 ? subs.map((s) => s.name).filter(Boolean).join(", ") : undefined}
          sectionKey="subs"
          editing={editing}
          onEditingChange={setEditing}
          view={
            subs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {d ? "None added under this department — this section is optional." : "Select a department to see its sub-departments."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="h-7 px-2 text-[0.65rem] uppercase">#</TableHead>
                      <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Name</TableHead>
                      <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Code</TableHead>
                      <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Function</TableHead>
                      <TableHead className="hidden h-7 px-2 text-[0.65rem] uppercase sm:table-cell">Description</TableHead>
                      <TableHead className="h-7 w-10 px-2 text-[0.65rem] uppercase">Remove</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subs.map((s, i) => (
                      <TableRow key={`${s.code ?? ""}-${i}`}>
                        <TableCell className="px-2 py-1.5 text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="px-2 py-1.5 text-xs font-medium">{s.name}</TableCell>
                        <TableCell className="px-2 py-1.5 text-xs">{s.code}</TableCell>
                        <TableCell className="px-2 py-1.5 text-xs">{s.function}</TableCell>
                        <TableCell className="hidden px-2 py-1.5 text-xs sm:table-cell">{s.description}</TableCell>
                        <TableCell className="px-2 py-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-6 text-critical"
                            aria-label={`Remove ${s.name ?? `sub-department ${i + 1}`}`}
                            onClick={() => removeSub(i)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          }
        />

        {hasAccount ? (
        <DetailSection
          icon={Building2}
          title="Administrator Account"
          step={5}
          complete={done.account}
          summary={account?.email}
          sectionKey="account"
          editing={editing}
          onEditingChange={setEditing}
          view={
            <ValueGrid
              rows={[
                { label: "Email ID", value: account?.email },
                // Never echo a password back, even in a review screen
                { label: "Password", value: account?.password ? "••••••••" : undefined },
              ]}
            />
          }
        />
        ) : null}
      </div>
    </StepCard>
  )
}
