import { useState } from "react"
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, isValid, parseISO } from "date-fns"
import { Building2, Check, Factory, Folder, MapPin, Network, Pencil, Trash2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateField, PhoneField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { StepCard } from "@/components/common/wizard-layout"
import { DetailSection, ValueGrid } from "@/components/common/detail-section"
import {
  countries,
  indianStates,
  plantTypes,
  salutations,
  timeZones,
} from "@/data/mock"
import { departmentTypes, plantCapacityUnitCodes, sectorLabelFor, sectorTypes, sectorsFor } from "@/data/master-data"
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

const SECTION_COUNT = 6

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
}: {
  data: OnboardingData
  onBack: () => void
  onChange: (patch: Partial<OnboardingData>) => void
  onSubmit: () => void
  submitting: boolean
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const { enterprise: e, location: l, plant: p, department: d, subDepartments: subs, account } = data

  const enterpriseForm = useForm<EnterpriseValues>({ resolver: zodResolver(enterpriseSchema), values: e })
  const locationForm = useForm<LocationValues>({ resolver: zodResolver(locationSchema), values: l })
  const plantForm = useForm<PlantValues>({ resolver: zodResolver(plantSchema), values: p })
  const departmentForm = useForm<DepartmentValues>({ resolver: zodResolver(departmentSchema), values: d })

  /** Validate a section's form, write it back into the shared data, then leave edit mode */
  const save =
    <T extends FieldValues>(form: UseFormReturn<T>, key: keyof OnboardingData) =>
    () => {
      void form.handleSubmit((values) => {
        onChange({ [key]: values } as Partial<OnboardingData>)
        setEditing(null)
      })()
    }

  const removeSub = (i: number) => onChange({ subDepartments: subs.filter((_, n) => n !== i) })

  const isIndia = locationForm.watch("country") === "India"

  /* Which sections carry data, so the header can report readiness honestly */
  const done = {
    enterprise: Boolean(e?.name),
    location: Boolean(l?.city),
    plant: Boolean(p?.name),
    department: Boolean(d?.name),
    subs: subs.length > 0,
    account: Boolean(account?.email),
  }
  const completeCount = Object.values(done).filter(Boolean).length
  const emptyOptional = [done.department, done.subs].filter((v) => !v).length

  return (
    <StepCard
      title="Step 6 of 6: Review & Submit"
      formId="step-review"
      nextLabel="Submit Onboarding"
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
                { label: "Plant", value: p?.name ? 1 : 0 },
                { label: "Dept", value: d?.name ? 1 : 0 },
                { label: "Sub-depts", value: subs.length },
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
              {completeCount} of {SECTION_COUNT} sections complete
            </span>
            <Progress
              value={(completeCount / SECTION_COUNT) * 100}
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
          summary={[e?.sectorType, e?.sector, e?.shortName].filter(Boolean).join(" · ")}
          sectionKey="enterprise"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(enterpriseForm, "enterprise")}
          view={
            <ValueGrid
              rows={[
                { label: "Enterprise Name", value: e?.name },
                { label: "Short Name", value: e?.shortName },
                { label: "Type", value: e?.sectorType },
                { label: sectorLabelFor(e?.sectorType), value: e?.sector },
                { label: "Website", value: e?.website },
                { label: "Description", value: e?.description },
              ]}
            />
          }
          edit={
            <SectionForm id="edit-enterprise" onSubmit={save(enterpriseForm, "enterprise")}>
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
            </SectionForm>
          }
        />

        <DetailSection
          icon={MapPin}
          title="Location"
          step={2}
          complete={done.location}
          summary={[l?.city, l?.state, l?.country].filter(Boolean).join(", ")}
          sectionKey="location"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(locationForm, "location")}
          view={
            <ValueGrid
              rows={[
                { label: "Country", value: l?.country },
                { label: "State", value: l?.state },
                { label: "City", value: l?.city },
                { label: "Postal Code", value: l?.pin },
                { label: "Latitude", value: l?.latitude },
                { label: "Longitude", value: l?.longitude },
                { label: "Address", value: l?.address },
              ]}
            />
          }
          edit={
            <SectionForm id="edit-location" onSubmit={save(locationForm, "location")}>
              <SelectField control={locationForm.control} name="country" label="Country" required options={countries} />
              {isIndia ? (
                <SelectField control={locationForm.control} name="state" label="State" required options={indianStates} />
              ) : (
                <TextField control={locationForm.control} name="state" label="State / Province" required />
              )}
              <TextField control={locationForm.control} name="city" label="City" required />
              <TextField control={locationForm.control} name="pin" label="Postal Code (PIN)" required />
              <TextField control={locationForm.control} name="latitude" label="Latitude" inputMode="decimal" />
              <TextField control={locationForm.control} name="longitude" label="Longitude" inputMode="decimal" />
              <TextareaField control={locationForm.control} name="address" label="Address (Head Office)" required rows={2} maxLength={250} className="md:col-span-3" />
            </SectionForm>
          }
        />

        <DetailSection
          icon={Factory}
          title="Plant"
          step={3}
          complete={done.plant}
          summary={[p?.name, p?.type].filter(Boolean).join(" · ")}
          sectionKey="plant"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(plantForm, "plant")}
          view={
            <ValueGrid
              rows={[
                { label: "Plant Name", value: p?.name },
                { label: "Plant Type", value: p?.type },
                { label: "Plant Code", value: p?.code },
                { label: "Plant Head", value: p ? [p.salutation, p.head].filter(Boolean).join(" ") : undefined },
                { label: "Email", value: p?.email },
                { label: "Phone Number", value: [p?.phoneCode, p?.phone].filter(Boolean).join(" ") },
                { label: "Capacity", value: [p?.capacity, p?.capacityUnit].filter(Boolean).join(" ") },
                { label: "Commissioning Date", value: formatDate(p?.commissioningDate) },
                { label: "Time Zone", value: p?.timeZone },
                { label: "Address", value: p?.address },
                { label: "Notes", value: p?.notes },
              ]}
            />
          }
          edit={
            <SectionForm id="edit-plant" onSubmit={save(plantForm, "plant")}>
              <TextField control={plantForm.control} name="name" label="Plant Name" required />
              <SelectField control={plantForm.control} name="type" label="Plant Type" required options={plantTypes} />
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
            </SectionForm>
          }
        />

        <DetailSection
          icon={Network}
          title="Department"
          step={4}
          complete={done.department}
          optional
          summary={[d?.name, d?.type].filter(Boolean).join(" · ")}
          sectionKey="department"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(departmentForm, "department")}
          view={
            <ValueGrid
              rows={[
                { label: "Department Name", value: d?.name },
                { label: "Department Code", value: d?.code },
                { label: "Type", value: d?.type },
                { label: "Parent Department", value: d?.parent },
                { label: "Head of Department", value: [d?.salutation, d?.head].filter(Boolean).join(" ") },
                { label: "Email", value: d?.email },
                { label: "Phone Number", value: [d?.phoneCode, d?.phone].filter(Boolean).join(" ") },
                { label: "Description", value: d?.description },
              ]}
            />
          }
          edit={
            <SectionForm id="edit-department" onSubmit={save(departmentForm, "department")}>
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
            </SectionForm>
          }
        />

        {/* Sub-departments are a list, so rows are removed here rather than re-keyed into a form */}
        <DetailSection
          icon={Folder}
          title="Sub-departments"
          step={5}
          complete={done.subs}
          optional
          summary={subs.length > 0 ? subs.map((s) => s.name).filter(Boolean).join(", ") : undefined}
          sectionKey="subs"
          editing={editing}
          onEditingChange={setEditing}
          view={
            subs.length === 0 ? (
              <p className="text-xs text-muted-foreground">None added — this section is optional.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="h-7 px-2 text-[0.65rem] uppercase">#</TableHead>
                      <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Name</TableHead>
                      <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Code</TableHead>
                      <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Function / Area</TableHead>
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

        <DetailSection
          icon={Building2}
          title="Administrator Account"
          step={6}
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
      </div>
    </StepCard>
  )
}
