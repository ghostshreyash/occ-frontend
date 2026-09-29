import { useState } from "react"
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Check, Factory, Folder, MapPin, Network, Pencil, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SelectField, TextareaField, TextField } from "@/components/form/fields"
import { StepCard } from "@/components/common/wizard-layout"
import {
  countries,
  departmentTypes,
  enterpriseTypes,
  indianStates,
  industrySectors,
  plantTypes,
  salutations,
  timeZones,
} from "@/data/mock"
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

type Row = { label: string; value?: string }
type SectionKey = "enterprise" | "location" | "plant" | "department" | "subs" | "account"

const years = Array.from({ length: 60 }, (_, i) => String(new Date().getFullYear() - i))

/** Read-only value grid; optional sections say so rather than showing blanks */
function ValueGrid({ rows }: { rows: Row[] }) {
  const filled = rows.filter((r) => r.value && r.value.trim() !== "")
  if (filled.length === 0) {
    return <p className="text-xs text-muted-foreground">Not provided — this section is optional.</p>
  }
  return (
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
      {filled.map((r) => (
        <div key={r.label} className="min-w-0">
          <dt className="text-[0.65rem] text-muted-foreground">{r.label}</dt>
          <dd className="truncate text-xs font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * A reviewable section. Edit swaps the value grid for the same fields used in the
 * wizard, inline — the review screen is never left.
 */
function Section({
  icon: Icon,
  title,
  sectionKey,
  editing,
  onEditingChange,
  onSave,
  formId,
  view,
  edit,
}: {
  icon: typeof Building2
  title: string
  sectionKey: SectionKey
  editing: SectionKey | null
  onEditingChange: (k: SectionKey | null) => void
  onSave?: () => void
  formId?: string
  view: React.ReactNode
  edit?: React.ReactNode
}) {
  const isEditing = editing === sectionKey
  const locked = editing !== null && !isEditing

  return (
    <section className={`rounded-lg ring-1 ${isEditing ? "ring-primary/40" : "ring-foreground/10"}`}>
      <header className={`flex items-center justify-between gap-2 rounded-t-lg px-3 py-1.5 ${isEditing ? "bg-info-soft" : "bg-muted/60"}`}>
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="size-3.5 text-primary" />
          {title}
        </h4>
        {edit ? (
          isEditing ? (
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[0.7rem]" onClick={() => onEditingChange(null)}>
                <X className="size-3" /> Cancel
              </Button>
              <Button type="button" size="sm" className="h-6 text-[0.7rem]" onClick={onSave} form={formId}>
                <Check className="size-3" /> Save
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[0.7rem]"
              disabled={locked}
              onClick={() => onEditingChange(sectionKey)}
            >
              <Pencil className="size-3" /> Edit
            </Button>
          )
        ) : null}
      </header>
      <div className="p-3">{isEditing ? edit : view}</div>
    </section>
  )
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
  const [editing, setEditing] = useState<SectionKey | null>(null)
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
        <p className="text-xs text-muted-foreground">
          Check the details below. <strong>Edit</strong> any section in place, then submit.
        </p>

        <Section
          icon={Building2}
          title="Enterprise"
          sectionKey="enterprise"
          editing={editing}
          onEditingChange={setEditing}
          formId="edit-enterprise"
          onSave={save(enterpriseForm, "enterprise")}
          view={
            <ValueGrid
              rows={[
                { label: "Enterprise Name", value: e?.name },
                { label: "Type", value: e?.type },
                { label: "Short Name", value: e?.shortName },
                { label: "Industry Sector", value: e?.sector },
                { label: "Website", value: e?.website },
                { label: "Description", value: e?.description },
              ]}
            />
          }
          edit={
            <SectionForm id="edit-enterprise" onSubmit={save(enterpriseForm, "enterprise")}>
              <TextField control={enterpriseForm.control} name="name" label="Enterprise Name" required className="md:col-span-2" />
              <TextField control={enterpriseForm.control} name="shortName" label="Short Name" required />
              <SelectField control={enterpriseForm.control} name="type" label="Enterprise Type" required options={enterpriseTypes} />
              <SelectField control={enterpriseForm.control} name="sector" label="Industry Sector" required options={industrySectors} />
              <TextField control={enterpriseForm.control} name="website" label="Website" />
              <TextareaField control={enterpriseForm.control} name="description" label="Description" rows={2} className="md:col-span-3" />
            </SectionForm>
          }
        />

        <Section
          icon={MapPin}
          title="Location"
          sectionKey="location"
          editing={editing}
          onEditingChange={setEditing}
          formId="edit-location"
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
              <TextField control={locationForm.control} name="latitude" label="Latitude" required inputMode="decimal" />
              <TextField control={locationForm.control} name="longitude" label="Longitude" required inputMode="decimal" />
              <TextareaField control={locationForm.control} name="address" label="Address (Head Office)" required rows={2} maxLength={250} className="md:col-span-3" />
            </SectionForm>
          }
        />

        <Section
          icon={Factory}
          title="Plant"
          sectionKey="plant"
          editing={editing}
          onEditingChange={setEditing}
          formId="edit-plant"
          onSave={save(plantForm, "plant")}
          view={
            <ValueGrid
              rows={[
                { label: "Plant Name", value: p?.name },
                { label: "Plant Type", value: p?.type },
                { label: "Plant Code", value: p?.code },
                { label: "Plant Head", value: p ? [p.salutation, p.head].filter(Boolean).join(" ") : undefined },
                { label: "Email", value: p?.email },
                { label: "Phone Number", value: p?.phone },
                { label: "Capacity", value: p?.capacity },
                { label: "Commissioning Year", value: p?.commissioningYear },
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
              <TextField control={plantForm.control} name="email" label="Email" type="email" />
              <TextField control={plantForm.control} name="phone" label="Phone Number" type="tel" />
              <TextField control={plantForm.control} name="capacity" label="Plant Capacity" />
              <SelectField control={plantForm.control} name="commissioningYear" label="Commissioning Year" options={years} />
              <SelectField control={plantForm.control} name="timeZone" label="Time Zone" options={timeZones} />
              <TextareaField control={plantForm.control} name="address" label="Plant Address" required rows={2} maxLength={250} className="md:col-span-3" />
              <TextareaField control={plantForm.control} name="notes" label="Notes" rows={2} className="md:col-span-3" />
            </SectionForm>
          }
        />

        <Section
          icon={Network}
          title="Department"
          sectionKey="department"
          editing={editing}
          onEditingChange={setEditing}
          formId="edit-department"
          onSave={save(departmentForm, "department")}
          view={
            <ValueGrid
              rows={[
                { label: "Department Name", value: d?.name },
                { label: "Department Code", value: d?.code },
                { label: "Type", value: d?.type },
                { label: "Parent Department", value: d?.parent },
                { label: "Head of Department", value: d?.head },
                { label: "Email", value: d?.email },
                { label: "Phone Number", value: d?.phone },
                { label: "Description", value: d?.description },
              ]}
            />
          }
          edit={
            <SectionForm id="edit-department" onSubmit={save(departmentForm, "department")}>
              <TextField control={departmentForm.control} name="name" label="Department Name" />
              <TextField control={departmentForm.control} name="code" label="Department Code" />
              <SelectField control={departmentForm.control} name="type" label="Department Type" options={departmentTypes} />
              <TextField control={departmentForm.control} name="head" label="Head of Department" />
              <TextField control={departmentForm.control} name="email" label="Email" type="email" />
              <TextField control={departmentForm.control} name="phone" label="Phone Number" type="tel" />
              <TextareaField control={departmentForm.control} name="description" label="Description" rows={2} className="md:col-span-3" />
            </SectionForm>
          }
        />

        {/* Sub-departments are a list, so rows are removed here rather than re-keyed into a form */}
        <Section
          icon={Folder}
          title={`Sub-departments (${subs.length})`}
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

        <Section
          icon={Building2}
          title="Enterprise Administrator Account"
          sectionKey="account"
          editing={editing}
          onEditingChange={setEditing}
          view={
            <ValueGrid
              rows={[
                { label: "Username", value: account?.username },
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
