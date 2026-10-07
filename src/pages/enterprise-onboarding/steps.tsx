import { useState } from "react"
import { useForm } from "react-hook-form"
import { Context, Ctx } from "@/components/common/wizard"
import { areaForPostalCode } from "@/data/master-data"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"
import { Building2, CheckCircle2, Factory, Folder, MapPin, Network, Pencil, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileDropField, PasswordField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { DepartmentFields, PlantFields, SubDepartmentFields } from "@/components/form/entity-fields"
import { PasswordRequirements, PasswordStrength } from "@/components/form/password-requirements"
import { StepCard } from "@/components/common/wizard-layout"
import { countries, indianStates } from "@/data/mock"
import { sectorLabelFor, sectorTypes, sectorsFor } from "@/data/master-data"
import {
  accountSchema,
  blankDepartment,
  blankPlant,
  blankSubDepartment,
  departmentSchema,
  enterpriseSchema,
  locationSchema,
  plantSchema,
  subDepartmentSchema,
  type AccountValues,
  type DepartmentEntry,
  type DepartmentValues,
  type EnterpriseValues,
  type LocationValues,
  type OnboardingData,
  type PlantEntry,
  type PlantValues,
  type SubDepartmentValues,
} from "./schemas"

type StepProps<T> = {
  data: OnboardingData
  onNext: (values: T) => void
  onBack?: () => void
}

/** A list-building step owns its own list and advances on its own terms */
type ListStepProps = {
  data: OnboardingData
  onPlantsChange: (plants: PlantEntry[]) => void
  onNext: () => void
  onBack: () => void
}

/**
 * The rows a list-building step has collected so far. A row can be reopened in
 * the form above it or dropped; the row being edited is tinted, so it is clear
 * the form is amending rather than adding.
 */
function EntryList<T>({
  items,
  columns,
  editingIndex,
  onEdit,
  onRemove,
  empty,
  rowLabel,
}: {
  items: T[]
  columns: { label: string; value: (item: T) => string | undefined; hideBelow?: "sm" | "md" }[]
  editingIndex: number | null
  onEdit: (index: number) => void
  onRemove: (index: number) => void
  empty: string
  rowLabel: (item: T, index: number) => string
}) {
  const hide = { sm: "hidden sm:table-cell", md: "hidden md:table-cell" }
  return (
    <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/70">
            <TableHead className="w-10">#</TableHead>
            {columns.map((c) => (
              <TableHead key={c.label} className={c.hideBelow ? hide[c.hideBelow] : undefined}>{c.label}</TableHead>
            ))}
            <TableHead className="w-24 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 2} className="py-6 text-center text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, i) => (
              <TableRow key={i} className={editingIndex === i ? "bg-accent" : undefined}>
                <TableCell>{i + 1}</TableCell>
                {columns.map((c) => (
                  <TableCell key={c.label} className={cn("max-w-56 truncate", c.hideBelow && hide[c.hideBelow])}>
                    {c.value(item)}
                  </TableCell>
                ))}
                <TableCell className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-primary"
                    aria-label={`Edit ${rowLabel(item, i)}`}
                    onClick={() => onEdit(i)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-critical"
                    aria-label={`Remove ${rowLabel(item, i)}`}
                    onClick={() => onRemove(i)}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/** Chooses which plant the rows below belong to, with a count so the picker says what is where */
function PlantPicker({
  id,
  label,
  plants,
  value,
  onChange,
  count,
  className,
}: {
  id: string
  label: string
  plants: PlantEntry[]
  value: number
  onChange: (index: number) => void
  count: (plant: PlantEntry) => string
  className?: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1.5 block text-xs font-medium">{label}</Label>
      <Select
        value={plants.length > 0 ? String(value) : undefined}
        onValueChange={(v) => onChange(Number(v))}
        disabled={plants.length === 0}
      >
        <SelectTrigger id={id} className="w-full">
          <Factory className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="No plants added yet" />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="start" avoidCollisions={false}>
          {plants.map((p, i) => (
            <SelectItem key={i} value={String(i)}>
              {p.name || `Plant ${i + 1}`}
              <span className="ml-2 text-muted-foreground">{count(p)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/* ---------------- Step 1 ---------------- */

export function EnterpriseStep({ data, onNext, onCancel }: StepProps<EnterpriseValues> & { onCancel: () => void }) {
  const form = useForm<EnterpriseValues>({
    resolver: zodResolver(enterpriseSchema),
    defaultValues: data.enterprise ?? { name: "", shortName: "", sectorType: "", sector: "", website: "", description: "" },
  })
  const { control, watch, setValue } = form
  const sectorType = watch("sectorType")
  return (
    <StepCard
      title="Step 1 of 6: Enterprise Name"
      formId="step-enterprise"
      nextLabel="Next: Location"
      onCancel={onCancel}
    >
      <form id="step-enterprise" onSubmit={form.handleSubmit(onNext)} className="grid gap-2.5 md:grid-cols-2" noValidate>
        <TextField control={control} name="name" label="Enterprise Name" required placeholder="Enter enterprise name (e.g. Tata Steel Limited)" />
        <TextField control={control} name="shortName" label="Short Name / Abbreviation" placeholder="Enter short name (e.g. TATA)" />

        {/* Type drives the sector list; changing it clears a now-invalid sector */}
        <SelectField
          control={control}
          name="sectorType"
          label="Type"
          required
          options={sectorTypes}
          placeholder="Select Industry or Retail"
          onValueChange={() => setValue("sector", "")}
        />
        <SelectField
          control={control}
          name="sector"
          label={sectorLabelFor(sectorType)}
          required
          options={sectorsFor(sectorType)}
          placeholder={sectorType ? "Select sector" : "Select a type first"}
          disabled={!sectorType}
        />

        <TextareaField control={control} name="description" label="Description" rows={2} placeholder="Enter a brief description about the enterprise..." className="md:col-span-2" />

        <FileDropField control={control} name="logo" label="Company Logo" />
        <TextField control={control} name="website" label="Website" placeholder="https://www.yourcompany.com" />
      </form>
    </StepCard>
  )
}

/* ---------------- Step 2 ---------------- */

export function LocationStep({ data, onNext, onBack }: StepProps<LocationValues>) {
  const form = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: data.location ?? { country: "India", state: "", city: "", address: "", pin: "" },
  })
  const { control, watch, setValue } = form
  const isIndia = watch("country") === "India"

  // The postal code resolves city and state in one go
  const fillFromPin = (code: string) => {
    const area = areaForPostalCode(code)
    if (!area) return
    setValue("city", area.city)
    setValue("state", area.state)
  }

  return (
    <StepCard
      title="Step 2 of 6: Location Details"
      formId="step-location"
      nextLabel="Next: Plant"
      onBack={onBack}
    >
      <Context>
        <Ctx icon={Building2} label="Enterprise Name" value={data.enterprise?.name} />
        <Ctx icon={Building2} label="Type" value={data.enterprise?.sectorType} />
        <Ctx icon={Factory} label="Industry Sector" value={data.enterprise?.sector} />
      </Context>
      <form id="step-location" onSubmit={form.handleSubmit(onNext)} className="grid gap-2.5 md:grid-cols-3" noValidate>
        <SelectField control={control} name="country" label="Country" required options={countries} />
        {isIndia ? (
          <SelectField control={control} name="state" label="State" required options={indianStates} placeholder="Select state" />
        ) : (
          <TextField control={control} name="state" label="State / Province" required />
        )}
        <TextField control={control} name="city" label="City" required placeholder="Enter city" />

        {/* Postal code sits in line with the address it belongs to */}
        <TextareaField control={control} name="address" label="Address (Head Office)" required rows={2} maxLength={250} className="md:col-span-2" />
        {/*
          * No coordinates here: the head office address is for correspondence.
          * Work is dispatched to a plant, so the pin on the map is set per plant
          * in step 3.
          */}
        <TextField control={control} name="pin" label="Postal Code (PIN)" required onValueChange={fillFromPin} />
      </form>
    </StepCard>
  )
}

/* ---------------- Step 3 ---------------- */

/** Step 3: an enterprise has as many plants as it has sites. At least one is required. */
export function PlantStep({ data, onPlantsChange, onNext, onBack }: ListStepProps) {
  const [editing, setEditing] = useState<number | null>(null)
  const [listError, setListError] = useState("")
  const form = useForm<PlantValues>({ resolver: zodResolver(plantSchema), defaultValues: blankPlant })

  const savePlant = form.handleSubmit((values) => {
    const plants = [...data.plants]
    // Amending a plant keeps the departments already added under it
    if (editing !== null) plants[editing] = { ...values, departments: plants[editing].departments }
    else plants.push({ ...values, departments: [] })
    onPlantsChange(plants)
    setEditing(null)
    setListError("")
    form.reset(blankPlant)
  })

  const removePlant = (i: number) => {
    onPlantsChange(data.plants.filter((_, n) => n !== i))
    if (editing === i) {
      setEditing(null)
      form.reset(blankPlant)
    }
  }

  const loc = data.location
  return (
    <StepCard
      title="Step 3 of 6: Plant Details"
      formId="step-plants"
      nextLabel="Next: Department"
      onBack={onBack}
    >
      <Context>
        <Ctx icon={Building2} label="Enterprise" value={data.enterprise?.name} />
        <Ctx icon={MapPin} label="Location" value={loc ? `${loc.city}, ${loc.state}, ${loc.country}` : ""} />
        <Ctx icon={Factory} label="Plants added" value={String(data.plants.length)} />
      </Context>

      {/* The footer's Next submits this, so advancing can be refused while the list is empty */}
      <form
        id="step-plants"
        onSubmit={(ev) => {
          ev.preventDefault()
          if (data.plants.length === 0) {
            setListError("Add at least one plant before continuing.")
            return
          }
          setListError("")
          onNext()
        }}
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold">{editing !== null ? `Editing plant ${editing + 1}` : "New plant"}</h4>
          <p className="text-xs text-muted-foreground">
            Fill in the plant, then add it. Repeat for every plant under this enterprise.
          </p>
        </div>
        <div className="flex gap-2">
          {editing !== null ? (
            <Button type="button" variant="outline" onClick={() => { setEditing(null); form.reset(blankPlant) }}>
              Cancel edit
            </Button>
          ) : null}
          <Button type="button" onClick={savePlant}>
            <Plus /> {editing !== null ? "Update Plant" : "Add Plant"}
          </Button>
        </div>
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        <PlantFields form={form} />
      </div>

      <EntryList
        items={data.plants}
        editingIndex={editing}
        onEdit={(i) => { setEditing(i); form.reset(data.plants[i]) }}
        onRemove={removePlant}
        empty="No plants added yet."
        rowLabel={(p, i) => p.name || `plant ${i + 1}`}
        columns={[
          { label: "Plant Name", value: (p) => p.name },
          { label: "Type", value: (p) => p.type },
          { label: "Code", value: (p) => p.code, hideBelow: "sm" },
          { label: "City", value: (p) => p.city },
          { label: "Plant Head", value: (p) => [p.salutation, p.head].filter(Boolean).join(" "), hideBelow: "md" },
          { label: "Depts", value: (p) => String(p.departments.length) },
        ]}
      />
      {listError ? <p className="mt-2 text-sm text-critical">{listError}</p> : null}
    </StepCard>
  )
}

/* ---------------- Step 4 ---------------- */

/** Step 4: departments, as many as each plant needs. Optional. */
export function DepartmentStep({ data, onPlantsChange, onNext, onBack }: ListStepProps) {
  const [plantIndex, setPlantIndex] = useState(0)
  const [editing, setEditing] = useState<number | null>(null)
  const [listError, setListError] = useState("")
  const form = useForm<DepartmentValues>({ resolver: zodResolver(departmentSchema), defaultValues: blankDepartment })

  /* A plant may have been removed in step 3 while a later index was selected */
  const current = Math.min(plantIndex, Math.max(0, data.plants.length - 1))
  const plant = data.plants[current]
  const departments = plant?.departments ?? []

  const writeDepartments = (next: DepartmentEntry[]) =>
    onPlantsChange(data.plants.map((p, i) => (i === current ? { ...p, departments: next } : p)))

  const saveDepartment = form.handleSubmit((values) => {
    // Every field is optional, so an entirely blank row would mean nothing
    if (!values.name?.trim() && !values.code?.trim() && !values.type?.trim()) {
      setListError("Enter a name, code or type before adding a department.")
      return
    }
    const next = [...departments]
    if (editing !== null) next[editing] = { ...values, subDepartments: next[editing].subDepartments }
    else next.push({ ...values, subDepartments: [] })
    writeDepartments(next)
    setEditing(null)
    setListError("")
    form.reset(blankDepartment)
  })

  const removeDepartment = (i: number) => {
    writeDepartments(departments.filter((_, n) => n !== i))
    if (editing === i) {
      setEditing(null)
      form.reset(blankDepartment)
    }
  }

  const loc = data.location
  return (
    <StepCard
      title="Step 4 of 6: Department Details"
      formId="step-departments"
      nextLabel="Next: Sub-department"
      onBack={onBack}
    >
      <Context>
        <Ctx icon={Building2} label="Enterprise" value={data.enterprise?.name} />
        <Ctx icon={MapPin} label="Location" value={loc ? `${loc.city}, ${loc.state}, ${loc.country}` : ""} />
        <Ctx icon={Factory} label="Plant" value={plant?.name} />
      </Context>

      <form id="step-departments" onSubmit={(ev) => { ev.preventDefault(); onNext() }} />

      <PlantPicker
        id="dept-plant"
        label="Add departments to"
        plants={data.plants}
        value={current}
        className="sm:max-w-80"
        onChange={(i) => {
          setPlantIndex(i)
          setEditing(null)
          setListError("")
          form.reset(blankDepartment)
        }}
        count={(p) => `${p.departments.length} dept${p.departments.length === 1 ? "" : "s"}`}
      />

      {plant ? (
        <>
          <div className="mt-3 mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-semibold">
                {editing !== null ? `Editing department ${editing + 1}` : "New department"} — {plant.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                Optional — add as many departments as this plant has, or continue without any.
              </p>
            </div>
            <div className="flex gap-2">
              {editing !== null ? (
                <Button type="button" variant="outline" onClick={() => { setEditing(null); form.reset(blankDepartment) }}>
                  Cancel edit
                </Button>
              ) : null}
              <Button type="button" onClick={saveDepartment}>
                <Plus /> {editing !== null ? "Update Department" : "Add Department"}
              </Button>
            </div>
          </div>

          <div className="grid gap-2.5 md:grid-cols-3">
            <DepartmentFields form={form} />
          </div>

          <EntryList
            items={departments}
            editingIndex={editing}
            onEdit={(i) => { setEditing(i); form.reset(departments[i]) }}
            onRemove={removeDepartment}
            empty={`No departments added under ${plant.name || "this plant"} yet.`}
            rowLabel={(d, i) => d.name || `department ${i + 1}`}
            columns={[
              { label: "Department", value: (d) => d.name },
              { label: "Code", value: (d) => d.code },
              { label: "Type", value: (d) => d.type, hideBelow: "sm" },
              { label: "Head", value: (d) => [d.salutation, d.head].filter(Boolean).join(" "), hideBelow: "md" },
              { label: "Sub-depts", value: (d) => String(d.subDepartments.length) },
            ]}
          />
          {listError ? <p className="mt-2 text-sm text-critical">{listError}</p> : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Add a plant in the previous step first.</p>
      )}
    </StepCard>
  )
}

/* ---------------- Step 5 ---------------- */

export function SubDepartmentAccountStep({
  data,
  onBack,
  onPlantsChange,
  onComplete,
  withAccount = true,
}: {
  data: OnboardingData
  onBack: () => void
  onPlantsChange: (plants: PlantEntry[]) => void
  onComplete: (account?: AccountValues) => void
  /** An enterprise being added to already has its administrator account, so that half is dropped */
  withAccount?: boolean
}) {
  const [plantIndex, setPlantIndex] = useState(0)
  const [deptIndex, setDeptIndex] = useState(0)
  const [editing, setEditing] = useState<number | null>(null)
  const [listError, setListError] = useState("")
  const sub = useForm<SubDepartmentValues>({ resolver: zodResolver(subDepartmentSchema), defaultValues: blankSubDepartment })
  const account = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onChange",
  })
  const passwordValue = account.watch("password")
  const confirmValue = account.watch("confirmPassword")
  const emailState = account.getFieldState("email", account.formState)

  /* Either selection can be left pointing past the end by an edit in an earlier step */
  const currentPlant = Math.min(plantIndex, Math.max(0, data.plants.length - 1))
  const plant = data.plants[currentPlant]
  const departments = plant?.departments ?? []
  const currentDept = Math.min(deptIndex, Math.max(0, departments.length - 1))
  const dept = departments[currentDept]
  const subs = dept?.subDepartments ?? []

  const writeSubs = (next: SubDepartmentValues[]) =>
    onPlantsChange(
      data.plants.map((p, i) =>
        i !== currentPlant
          ? p
          : { ...p, departments: p.departments.map((d, j) => (j === currentDept ? { ...d, subDepartments: next } : d)) }
      )
    )

  const saveSubDepartment = sub.handleSubmit((values) => {
    // Fields are optional, but an entirely blank row would be meaningless
    if (!values.name?.trim() && !values.code?.trim() && !values.function?.trim()) {
      setListError("Enter a name, code or function before adding a sub-department.")
      return
    }
    const next = [...subs]
    if (editing !== null) next[editing] = values
    else next.push(values)
    writeSubs(next)
    setEditing(null)
    setListError("")
    sub.reset(blankSubDepartment)
  })

  const complete = account.handleSubmit((values) => onComplete(values))

  const loc = data.location
  return (
    <StepCard
      title={withAccount ? "Step 5 of 6: Sub-department Details & Account Creation" : "Step 5 of 6: Sub-department Details"}
      formId={withAccount ? "step-account" : "step-subdepartments"}
      nextLabel="Next: Review"
      onBack={onBack}
    >
      <Context>
        <Ctx icon={Building2} label="Enterprise" value={data.enterprise?.name} />
        <Ctx icon={MapPin} label="Location" value={loc ? `${loc.city}, ${loc.state}, ${loc.country}` : ""} />
        <Ctx icon={Factory} label="Plant" value={plant?.name} />
        <Ctx icon={Network} label="Department" value={dept?.name} />
      </Context>

      {withAccount ? null : <form id="step-subdepartments" onSubmit={(ev) => { ev.preventDefault(); onComplete() }} />}

      <h4 className="font-semibold">{withAccount ? "1. Sub-department Details" : "Sub-department Details"}</h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Optional — pick a department, then add one or more sub-departments under it.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-2 sm:max-w-2xl">
        <PlantPicker
          id="sub-plant"
          label="Plant"
          plants={data.plants}
          value={currentPlant}
          onChange={(i) => {
            setPlantIndex(i)
            setDeptIndex(0)
            setEditing(null)
            sub.reset(blankSubDepartment)
          }}
          count={(p) => `${p.departments.length} dept${p.departments.length === 1 ? "" : "s"}`}
        />
        <div>
          <Label htmlFor="sub-dept" className="mb-1.5 block text-xs font-medium">Department</Label>
          <Select
            value={departments.length > 0 ? String(currentDept) : undefined}
            onValueChange={(v) => {
              setDeptIndex(Number(v))
              setEditing(null)
              sub.reset(blankSubDepartment)
            }}
            disabled={departments.length === 0}
          >
            <SelectTrigger id="sub-dept" className="w-full">
              <Network className="size-3.5 text-muted-foreground" />
              <SelectValue placeholder={plant ? "No departments under this plant" : "Add a plant first"} />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" avoidCollisions={false}>
              {departments.map((d, i) => (
                <SelectItem key={i} value={String(i)}>
                  {d.name || `Department ${i + 1}`}
                  <span className="ml-2 text-muted-foreground">
                    {d.subDepartments.length} sub-dept{d.subDepartments.length === 1 ? "" : "s"}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {dept ? (
        <>
          <div className="mt-3 mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold">
              {editing !== null ? `Editing sub-department ${editing + 1}` : "New sub-department"} — {dept.name}
            </h4>
            <div className="flex gap-2">
              {editing !== null ? (
                <Button type="button" variant="outline" onClick={() => { setEditing(null); sub.reset(blankSubDepartment) }}>
                  Cancel edit
                </Button>
              ) : null}
              <Button type="button" onClick={saveSubDepartment}>
                <Plus /> {editing !== null ? "Update Sub-department" : "Add Sub-department"}
              </Button>
            </div>
          </div>

          <div className="grid gap-2.5 md:grid-cols-3">
            <SubDepartmentFields form={sub} />
          </div>

          <EntryList
            items={subs}
            editingIndex={editing}
            onEdit={(i) => { setEditing(i); sub.reset(subs[i]) }}
            onRemove={(i) => {
              writeSubs(subs.filter((_, n) => n !== i))
              if (editing === i) {
                setEditing(null)
                sub.reset(blankSubDepartment)
              }
            }}
            empty={`No sub-departments added under ${dept.name || "this department"} yet.`}
            rowLabel={(s, i) => s.name || `sub-department ${i + 1}`}
            columns={[
              { label: "Sub-department Name", value: (s) => s.name },
              { label: "Code", value: (s) => s.code },
              { label: "Function", value: (s) => s.function },
              { label: "Description", value: (s) => s.description, hideBelow: "sm" },
            ]}
          />
          {listError ? <p className="mt-2 text-sm text-critical">{listError}</p> : null}
        </>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Folder className="size-4" />
          {plant
            ? "Add a department to this plant first — a sub-department sits under one."
            : "Add a plant first."}
        </p>
      )}

      {withAccount ? (
        <>
      <h4 className="mt-6 font-semibold">2. Enterprise Account Creation</h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Create a login account for the enterprise administrator. This will be used to access the EMMS-E portal.
      </p>
      <form id="step-account" onSubmit={complete} className="grid gap-2.5 md:grid-cols-[1fr_1fr_1.1fr]" noValidate>
        <div className="relative">
          <TextField control={account.control} name="email" label="Email ID" required type="email" placeholder="admin@company.com" description="This email is used to sign in to EMMS-E." />
          {emailState.isDirty && !emailState.invalid ? (
            <CheckCircle2 className="absolute top-8 right-2.5 size-4 text-healthy" />
          ) : null}
        </div>
        <div className="space-y-2">
          <PasswordField control={account.control} name="password" label="Password" required />
          <PasswordStrength value={passwordValue} />
        </div>
        <div className="md:row-span-2">
          <PasswordRequirements value={passwordValue} />
        </div>
        <div>
          <PasswordField control={account.control} name="confirmPassword" label="Confirm Password" required />
          {/* Stated here so whoever onboards knows this password is temporary */}
          <p className="md:col-span-2 rounded-md bg-muted/40 p-2.5 text-[0.7rem] text-muted-foreground">
            The enterprise is prompted to set their own password the first time they sign in, and is
            notified when the account is created. OCC cannot read or reset it afterwards.
          </p>
          {confirmValue && confirmValue === passwordValue ? (
            <p className="mt-1 text-xs font-medium text-healthy-soft-foreground">Passwords match.</p>
          ) : null}
        </div>
      </form>
        </>
      ) : null}
    </StepCard>
  )
}
