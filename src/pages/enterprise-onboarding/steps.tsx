import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, CheckCircle2, Factory, Info, MapPin, Network, Pencil, Plus, Search, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FieldLabel } from "@/components/ui/field"
import { DateField, FileDropField, PasswordField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { PasswordRequirements, PasswordStrength } from "@/components/form/password-requirements"
import { StepCard } from "@/components/common/wizard-layout"
import { LocationPicker } from "@/components/common/location-picker"
import {
  countries,
  departmentTypes,
  enterpriseTypes,
  indianStates,
  industrySectors,
  plantTypes,
  salutations,
  subDepartmentFunctions,
  timeZones,
} from "@/data/mock"
import {
  accountSchema,
  departmentSchema,
  enterpriseSchema,
  locationSchema,
  plantSchema,
  subDepartmentSchema,
  type AccountValues,
  type DepartmentValues,
  type EnterpriseValues,
  type LocationValues,
  type OnboardingData,
  type PlantValues,
  type SubDepartmentValues,
} from "./schemas"

type StepProps<T> = {
  data: OnboardingData
  onNext: (values: T) => void
  onBack?: () => void
}

/** Blue strip summarising earlier steps (matches the mockups) */
function Context({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-info-soft px-3 py-2 text-xs">
      <Info className="size-4 text-primary" />
      {children}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  )
}

function Ctx({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value?: string }) {
  return (
    <span className="flex items-center gap-1.5 border-l border-primary/20 pl-3 first-of-type:border-0 first-of-type:pl-0">
      <Icon className="size-3.5 text-primary" />
      {label}: <strong>{value}</strong>
    </span>
  )
}

/* ---------------- Step 1 ---------------- */

export function EnterpriseStep({ data, onNext, onCancel }: StepProps<EnterpriseValues> & { onCancel: () => void }) {
  const form = useForm<EnterpriseValues>({
    resolver: zodResolver(enterpriseSchema),
    defaultValues: data.enterprise ?? { name: "", type: "", shortName: "", sector: "", website: "", description: "" },
  })
  const { control } = form
  return (
    <StepCard
      title="Step 1 of 6: Enterprise Name"
      formId="step-enterprise"
      nextLabel="Next: Location"
      onCancel={onCancel}
    >
      <form id="step-enterprise" onSubmit={form.handleSubmit(onNext)} className="grid gap-2.5 md:grid-cols-2" noValidate>
        <TextField control={control} name="name" label="Enterprise Name" required placeholder="Enter enterprise name (e.g. Tata Steel Limited)" className="md:col-span-2" />
        <SelectField control={control} name="type" label="Enterprise Type" required options={enterpriseTypes} placeholder="Select enterprise type" />
        <TextField control={control} name="shortName" label="Short Name / Abbreviation" required placeholder="Enter short name (e.g. TATA)" />
        <SelectField control={control} name="sector" label="Industry Sector" required options={industrySectors} placeholder="Select industry sector" />
        <TextField control={control} name="website" label="Website" placeholder="https://www.yourcompany.com" />
        <FileDropField control={control} name="logo" label="Company Logo" />
        <TextareaField control={control} name="description" label="Description" rows={3} placeholder="Enter a brief description about the enterprise..." />
      </form>
    </StepCard>
  )
}

/* ---------------- Step 2 ---------------- */

export function LocationStep({ data, onNext, onBack }: StepProps<LocationValues>) {
  const form = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: data.location ?? { country: "India", state: "", city: "", address: "", pin: "", latitude: "", longitude: "" },
  })
  const { control, watch, setValue } = form
  const isIndia = watch("country") === "India"
  const lat = parseFloat(watch("latitude") ?? "")
  const lng = parseFloat(watch("longitude") ?? "")

  return (
    <StepCard
      title="Step 2 of 6: Location Details"
      formId="step-location"
      nextLabel="Next: Plant"
      onBack={onBack}
    >
      <Context>
        <Ctx icon={Building2} label="Enterprise Name" value={data.enterprise?.name} />
        <Ctx icon={Building2} label="Enterprise Type" value={data.enterprise?.type} />
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

        <TextField control={control} name="pin" label="Postal Code (PIN)" required />
        <TextField control={control} name="latitude" label="Latitude" required inputMode="decimal" placeholder="19.0759" />
        <TextField control={control} name="longitude" label="Longitude" required inputMode="decimal" placeholder="72.8777" />

        <TextareaField control={control} name="address" label="Address (Head Office)" required rows={2} maxLength={250} className="md:col-span-3" />

        <div className="md:col-span-3">
          <FieldLabel className="mb-2">
            Select Location on Map
          </FieldLabel>
          <div className="relative">
            <div className="absolute top-3 left-3 z-10 flex w-72 max-w-[70%] items-center rounded-md bg-card shadow">
              <Input placeholder="Search location (e.g. Mumbai, Maharashtra)" className="border-0 bg-transparent" />
              <Search className="mr-2 size-4 text-muted-foreground" />
            </div>
            <LocationPicker
              lat={Number.isNaN(lat) ? undefined : lat}
              lng={Number.isNaN(lng) ? undefined : lng}
              onChange={({ lat, lng }) => {
                setValue("latitude", String(lat))
                setValue("longitude", String(lng))
              }}
            />
          </div>
        </div>
      </form>
    </StepCard>
  )
}

/* ---------------- Step 3 ---------------- */

export function PlantStep({ data, onNext, onBack }: StepProps<PlantValues>) {
  const form = useForm<PlantValues>({
    resolver: zodResolver(plantSchema),
    defaultValues: data.plant ?? {
      name: "", type: "", code: "", address: "", salutation: "Mr.", head: "", email: "", phone: "",
      capacity: "", commissioningDate: "", timeZone: timeZones[0], notes: "",
    },
  })
  const { control } = form
  const loc = data.location
  return (
    <StepCard
      title="Step 3 of 6: Plant Details"
      formId="step-plant"
      nextLabel="Next: Department"
      onBack={onBack}
    >
      <Context
        action={
          <Button type="button" size="xs" variant="outline" className="bg-card text-primary" onClick={onBack}>
            <MapPin /> Change Location
          </Button>
        }
      >
        <Ctx icon={Building2} label="Enterprise" value={data.enterprise?.name} />
        <Ctx icon={MapPin} label="Location" value={loc ? `${loc.city}, ${loc.state}, ${loc.country}` : ""} />
      </Context>
      <form id="step-plant" onSubmit={form.handleSubmit(onNext)} className="grid gap-2.5 md:grid-cols-3" noValidate>
        <TextField control={control} name="name" label="Plant Name" required placeholder="e.g. Mumbai Works" />
        <SelectField control={control} name="type" label="Plant Type" required options={plantTypes} />
        <TextField control={control} name="code" label="Plant Code" placeholder="e.g. TS-MUM-001" />

        {/*
          Contact details sit on one row, then the address spans the full width.
          The previous row-span + spacer arrangement left a hole under Plant Head.
        */}
        <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
          <SelectField control={control} name="salutation" label="Title" required options={salutations} />
          <TextField control={control} name="head" label="Plant Head" required placeholder="e.g. S. Krishnan" />
        </div>
        <TextField control={control} name="email" label="Email" type="email" placeholder="name@company.com" />
        <TextField control={control} name="phone" label="Phone Number" type="tel" placeholder="+91 98765 43210" />

        <TextareaField control={control} name="address" label="Plant Address" required rows={2} maxLength={250} className="md:col-span-3" />

        <h4 className="text-sm font-semibold md:col-span-3">
          Additional Information
        </h4>
        <TextField control={control} name="capacity" label="Plant Capacity" placeholder="e.g. 5 MTPA" />
        <DateField control={control} name="commissioningDate" label="Commissioning Date" />
        <SelectField control={control} name="timeZone" label="Time Zone" options={timeZones} />

        <FileDropField control={control} name="logo" label="Plant Logo" />
        <TextareaField control={control} name="notes" label="Notes" rows={4} placeholder="Enter any additional information about the plant..." className="md:col-span-2" />
      </form>
    </StepCard>
  )
}

/* ---------------- Step 4 ---------------- */

export function DepartmentStep({ data, onNext, onBack }: StepProps<DepartmentValues>) {
  const form = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: data.department ?? {
      name: "", code: "", type: "", parent: "", head: "", email: "", phone: "", location: data.plant?.name ?? "", description: "",
    },
  })
  const { control } = form
  const loc = data.location
  return (
    <StepCard
      title="Step 4 of 6: Department Details"
      formId="step-department"
      nextLabel="Next: Sub-department"
      onBack={onBack}
    >
      <Context>
        <Ctx icon={Building2} label="Enterprise" value={data.enterprise?.name} />
        <Ctx icon={MapPin} label="Location" value={loc ? `${loc.city}, ${loc.state}, ${loc.country}` : ""} />
        <Ctx icon={Factory} label="Plant" value={data.plant?.name} />
      </Context>
      <form id="step-department" onSubmit={form.handleSubmit(onNext)} className="grid gap-2.5 md:grid-cols-2" noValidate>
        <TextField control={control} name="name" label="Department Name" placeholder="e.g. Electrical" />
        <TextField control={control} name="code" label="Department Code" placeholder="e.g. DEP-EL" />
        <SelectField control={control} name="type" label="Department Type" options={departmentTypes} />
        <SelectField control={control} name="parent" label="Parent Department" options={["None", "Electrical Engineering", "Engineering Services", "Plant Operations"]} />
        <TextField control={control} name="head" label="Head of Department" />
        <TextField control={control} name="email" label="Email" type="email" />
        <TextField control={control} name="phone" label="Phone Number" type="tel" />
        <SelectField control={control} name="location" label="Location" options={data.plant?.name ? [data.plant.name] : []} />
        <TextareaField control={control} name="description" label="Department Description" rows={3} className="md:col-span-2" />
      </form>
    </StepCard>
  )
}

/* ---------------- Step 5 ---------------- */

export function SubDepartmentAccountStep({
  data,
  onBack,
  onSubDepartmentsChange,
  onComplete,
}: {
  data: OnboardingData
  onBack: () => void
  onSubDepartmentsChange: (items: SubDepartmentValues[]) => void
  onComplete: (account: AccountValues) => void
}) {
  const [editing, setEditing] = useState<number | null>(null)
  const [listError, setListError] = useState("")
  const sub = useForm<SubDepartmentValues>({
    resolver: zodResolver(subDepartmentSchema),
    defaultValues: { name: "", code: "", function: "", description: "" },
  })
  const account = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: { username: "", password: "", confirmPassword: "" },
    mode: "onChange",
  })
  const passwordValue = account.watch("password")
  const confirmValue = account.watch("confirmPassword")
  const usernameState = account.getFieldState("username", account.formState)

  const saveSubDepartment = sub.handleSubmit((values) => {
    // Fields are optional, but an entirely blank row would be meaningless
    const isBlank = !values.name?.trim() && !values.code?.trim() && !values.function?.trim()
    if (isBlank) {
      setListError("Enter a name, code or function before adding a sub-department.")
      return
    }
    const items = [...data.subDepartments]
    if (editing !== null) items[editing] = values
    else items.push(values)
    onSubDepartmentsChange(items)
    setEditing(null)
    setListError("")
    sub.reset({ name: "", code: "", function: "", description: "" })
  })

  const complete = account.handleSubmit((values) => onComplete(values))

  const loc = data.location
  return (
    <StepCard
      title="Step 5 of 6: Sub-department Details & Account Creation"
      formId="step-account"
      nextLabel="Next: Review"
      onBack={onBack}
    >
      <Context>
        <Ctx icon={Building2} label="Enterprise" value={data.enterprise?.name} />
        <Ctx icon={MapPin} label="Location" value={loc ? `${loc.city}, ${loc.state}, ${loc.country}` : ""} />
        <Ctx icon={Factory} label="Plant" value={data.plant?.name} />
        <Ctx icon={Network} label="Department" value={data.department?.name} />
      </Context>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold">1. Sub-department Details</h4>
          <p className="text-xs text-muted-foreground">Optional — add one or more sub-departments, or continue without any.</p>
        </div>
        <Button type="button" onClick={saveSubDepartment}>
          <Plus /> {editing !== null ? "Update Sub-department" : "Add Sub-department"}
        </Button>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        <TextField control={sub.control} name="name" label="Sub-department Name" placeholder="e.g. HT Maintenance" />
        <TextField control={sub.control} name="code" label="Sub-department Code" placeholder="e.g. SUB-EL-HT" />
        <SelectField control={sub.control} name="function" label="Function / Area" options={subDepartmentFunctions} />
        <TextField control={sub.control} name="description" label="Description" className="md:col-span-3" />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Sub-department Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Function / Area</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.subDepartments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  No sub-departments added yet.
                </TableCell>
              </TableRow>
            ) : (
              data.subDepartments.map((s, i) => (
                <TableRow key={`${s.code ?? ""}-${i}`} className={editing === i ? "bg-accent" : undefined}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.code}</TableCell>
                  <TableCell>{s.function}</TableCell>
                  <TableCell className="max-w-56 truncate">{s.description}</TableCell>
                  <TableCell className="text-center">
                    <Button type="button" variant="ghost" size="icon-sm" className="text-primary" aria-label="Edit" onClick={() => { setEditing(i); sub.reset(s) }}>
                      <Pencil />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-critical"
                      aria-label="Delete"
                      onClick={() => onSubDepartmentsChange(data.subDepartments.filter((_, j) => j !== i))}
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
      {listError ? <p className="mt-2 text-sm text-critical">{listError}</p> : null}

      <h4 className="mt-6 font-semibold">2. Enterprise Account Creation</h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Create a login account for the enterprise administrator. This will be used to access the EMMS-E portal.
      </p>
      <form id="step-account" onSubmit={complete} className="grid gap-2.5 md:grid-cols-[1fr_1fr_1.1fr]" noValidate>
        <div className="relative">
          <TextField control={account.control} name="username" label="Username" required description="Username must be at least 6 characters." />
          {usernameState.isDirty && !usernameState.invalid ? (
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
          {confirmValue && confirmValue === passwordValue ? (
            <p className="mt-1 text-xs font-medium text-healthy-soft-foreground">Passwords match.</p>
          ) : null}
        </div>
      </form>
    </StepCard>
  )
}
