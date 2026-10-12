import { useState } from "react"
import { useForm } from "react-hook-form"
import { Context, Ctx } from "@/components/common/wizard"
import { areaForPostalCode } from "@/data/master-data"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "cn"
import { Building2, CheckCircle2, Factory, Folder, KeyRound, MapPin, Network, Pencil, Plus, Trash2, UserRound } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileDropField, PasswordField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { DepartmentFields, PlantFields, SubDepartmentFields } from "@/components/form/entity-fields"
import { PasswordRequirements, PasswordStrength } from "@/components/form/password-requirements"
import { StepCard } from "@/components/common/wizard-layout"
import { countries, indianStates } from "@/data/mock"
import { accessOptions, defaultScreenFor, emmseOperatives, plantManagerRoles, roleForAccess, roleLockedBy, sectorLabelFor, sectorTypes, sectorsFor } from "@/data/master-data"
import {
  accountSchema,
  blankDepartment,
  blankPlant,
  blankSubDepartment,
  departmentSchema,
  enterpriseDetailsSchema,
  plantManagerSchema,
  plantSchema,
  splitEnterpriseDetails,
  subDepartmentSchema,
  type AccountValues,
  type DepartmentEntry,
  type DepartmentValues,
  type EnterpriseDetailsValues,
  type EnterpriseValues,
  type LocationValues,
  type OnboardingData,
  type PlantEntry,
  type PlantManagerValues,
  type PlantValues,
  type SubDepartmentValues,
} from "./schemas"

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

/* ---------------- Step 1 ---------------- */

/**
 * The enterprise and the head office it is registered at, captured together -
 * they describe one organisation, so splitting them over two steps only added a
 * click. They are stored apart, because the location is edited on its own later.
 */
/**
 * The enterprise administrator's EMMS-E login, in a modal on the enterprise step.
 *
 * It belongs with the enterprise rather than on a step of its own — it is one
 * account for the whole enterprise, not per plant. The body scrolls because the
 * password requirements make it taller than a short dialog.
 */
function EnterpriseAdminDialog({
  open,
  onOpenChange,
  enterpriseName,
  existing,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  enterpriseName?: string
  existing?: AccountValues
  onSave: (values: AccountValues) => void
}) {
  const account = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: existing ?? { email: "", password: "", confirmPassword: "" },
    mode: "onChange",
  })
  const passwordValue = account.watch("password")
  const confirmValue = account.watch("confirmPassword")
  const emailState = account.getFieldState("email", account.formState)

  const submit = account.handleSubmit((values) => {
    onSave(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <KeyRound className="size-4 text-primary" /> {existing ? "Edit" : "Add"} Enterprise Admin
          </DialogTitle>
          <DialogDescription>
            Creates the administrator login for {enterpriseName || "this enterprise"}, used to access the EMMS-E portal.
          </DialogDescription>
        </DialogHeader>

        <form id="enterprise-admin" onSubmit={submit} className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1" noValidate>
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
          <PasswordRequirements value={passwordValue} />
          <div>
            <PasswordField control={account.control} name="confirmPassword" label="Confirm Password" required />
            {confirmValue && confirmValue === passwordValue ? (
              <p className="mt-1 text-xs font-medium text-healthy-soft-foreground">Passwords match.</p>
            ) : null}
          </div>
          {/* Stated here so whoever onboards knows this password is temporary */}
          <p className="rounded-md bg-muted/40 p-2.5 text-[0.7rem] text-muted-foreground">
            The enterprise is prompted to set their own password the first time they sign in, and is
            notified when the account is created. OCC cannot read or reset it afterwards.
          </p>
        </form>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit}><Plus className="size-3.5" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function EnterpriseStep({
  data,
  onNext,
  onCancel,
  onAccountChange,
}: {
  data: OnboardingData
  onNext: (values: { enterprise: EnterpriseValues; location: LocationValues }) => void
  onCancel: () => void
  onAccountChange: (account: AccountValues) => void
}) {
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminError, setAdminError] = useState("")
  const account = data.account
  const form = useForm<EnterpriseDetailsValues>({
    resolver: zodResolver(enterpriseDetailsSchema),
    defaultValues: {
      name: "", shortName: "", sectorType: "", sector: "", website: "", description: "",
      accessOption: "",
      country: "India", state: "", city: "", address: "", pin: "",
      ...data.enterprise,
      ...data.location,
    },
  })
  const { control, watch, setValue } = form
  const sectorType = watch("sectorType")
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
      title="Step 1 of 3: Enterprise Details"
      formId="step-enterprise"
      nextLabel="Next: Plant & Structure"
      onCancel={onCancel}
      extraAction={
        <Button type="button" onClick={() => setAdminOpen(true)}>
          <Plus /> {account ? "Edit Enterprise Admin" : "Add Enterprise Admin"}
        </Button>
      }
    >
      <form
        id="step-enterprise"
        onSubmit={form.handleSubmit((values) => {
          // The administrator account is part of onboarding, so it gates the step
          if (!account) {
            setAdminError("Add the enterprise administrator before continuing.")
            setAdminOpen(true)
            return
          }
          onNext(splitEnterpriseDetails(values))
        })}
        className="grid gap-2.5 md:grid-cols-3"
        noValidate
      >
        <TextField control={control} name="name" label="Enterprise Name" required placeholder="Enter enterprise name (e.g. Tata Steel Limited)" className="md:col-span-2" />
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
        <SelectField
          control={control}
          name="accessOption"
          label="Access Options"
          required
          options={accessOptions}
          placeholder="Select Monitoring or Management"
          description={sectorType ? `${sectorType} enterprises usually take ${defaultScreenFor(sectorType)}.` : undefined}
        />
        {/* Website on its own line; description and logo share the next one */}
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-2.5 md:col-span-3">
          <KeyRound className="size-4 shrink-0 text-primary" />
          <span className="text-xs">
            <span className="font-medium">Enterprise Admin</span>{" "}
            {account ? (
              <span className="text-muted-foreground">{account.email}</span>
            ) : (
              <span className="text-muted-foreground">not added yet — use Add Enterprise Admin below.</span>
            )}
          </span>
          {adminError && !account ? <span className="text-xs font-medium text-critical">{adminError}</span> : null}
        </div>

        <TextField control={control} name="website" label="Website" placeholder="https://www.yourcompany.com" className="md:col-span-3" />

        <TextareaField control={control} name="description" label="Description" rows={2} placeholder="Enter a brief description about the enterprise..." className="md:col-span-2" />
        <FileDropField control={control} name="logo" label="Company Logo" />

        <h4 className="mt-2 flex items-center gap-1.5 text-sm font-semibold md:col-span-3">
          <MapPin className="size-4 text-primary" /> Head Office
        </h4>

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
          * in the next step.
          */}
        <TextField control={control} name="pin" label="Postal Code (PIN)" required onValueChange={fillFromPin} />
      </form>
      <EnterpriseAdminDialog
        key={adminOpen ? "open" : "closed"}
        open={adminOpen}
        onOpenChange={setAdminOpen}
        enterpriseName={watch("name")}
        existing={account}
        onSave={(values) => {
          onAccountChange(values)
          setAdminError("")
        }}
      />
    </StepCard>
  )
}

/* ---------------- Step 2 ---------------- */

const subCountOf = (p: PlantEntry) => p.departments.reduce((n, d) => n + d.subDepartments.length, 0)

/**
 * Everything added to the enterprise so far, collapsed to one row per plant.
 *
 * The point is to see the shape of what is being built without scrolling the
 * forms: how many plants, and what sits under each. Expanding a row shows that
 * plant's departments and their sub-departments.
 */
export function PlantOverview({
  enterprise,
  plants,
  currentIndex,
  onSelect,
  onRemove,
  open,
  onOpenChange,
  title = "Plants added",
}: {
  enterprise?: string
  plants: PlantEntry[]
  currentIndex?: number
  onSelect?: (i: number) => void
  onRemove?: (i: number) => void
  /** Rows to start expanded — the one just saved, so its departments stay in view */
  open?: string[]
  onOpenChange?: (v: string[]) => void
  title?: string
}) {
  if (plants.length === 0) return null

  return (
    <section className="mb-4 rounded-lg border bg-muted/30 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {enterprise ? <p className="text-xs text-muted-foreground">Enterprise: {enterprise}</p> : null}
        </div>
        <Badge variant="neutral" className="rounded-full px-2 py-0.5 text-[0.65rem]">
          {plants.length} {plants.length === 1 ? "Plant" : "Plants"}
        </Badge>
      </div>

      <Accordion type="multiple" value={open} onValueChange={onOpenChange} className="space-y-1.5">
        {plants.map((p, i) => {
          const subs = subCountOf(p)
          return (
            <AccordionItem key={i} value={`plant-${i}`} className="relative rounded-md border bg-card px-2.5 last:border-b">
              {/* No flex wrapper: the accordion header is block-level, so the
                  trigger fills the row and its chevron lands on the right. The
                  padding leaves room for the actions pinned beside it. */}
              <AccordionTrigger className="py-2 pr-16 hover:no-underline">
                  <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                    <Factory className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name || `Plant ${i + 1}`}</span>
                      <span className="block text-xs text-muted-foreground">
                        {p.departments.length} department{p.departments.length === 1 ? "" : "s"} · {subs} sub-department{subs === 1 ? "" : "s"}
                      </span>
                    </span>
                  </span>
              </AccordionTrigger>

              {/* Pinned top-right beside the chevron, and outside the trigger so a
                  click acts on the plant rather than toggling the row */}
                {onSelect || onRemove ? (
                  <span className="absolute top-2 right-2.5 flex shrink-0 items-center gap-0.5">
                    {onSelect ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${p.name || `plant ${i + 1}`}`}
                        title={i === currentIndex ? "Editing below" : "Edit this plant"}
                        disabled={i === currentIndex}
                        className="size-7 text-muted-foreground"
                        onClick={() => onSelect(i)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                    {onRemove ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${p.name || `plant ${i + 1}`}`}
                        title="Remove this plant"
                        className="size-7 text-critical hover:text-critical"
                        onClick={() => onRemove(i)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    ) : null}
                </span>
              ) : null}
              <AccordionContent className="pb-2.5">
                {p.departments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No departments under this plant.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {p.departments.map((d, j) => (
                      <li key={j} className="rounded bg-muted/50 px-2 py-1.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <Network className="size-3.5 text-muted-foreground" />
                          {d.name || `Department ${j + 1}`}
                        </span>
                        {d.subDepartments.length > 0 ? (
                          <ul className="mt-1 ml-5 space-y-0.5">
                            {d.subDepartments.map((sd, k) => (
                              <li key={k} className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                                <Folder className="size-3" />
                                {sd.name || `Sub-department ${k + 1}`}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-0.5 ml-5 text-[0.7rem] text-muted-foreground">No sub-departments.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {p.manager ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                    <UserRound className="size-3.5" /> {p.manager.role}: {p.manager.email}
                  </p>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </section>
  )
}

/**
 * The plant's own login.
 *
 * The role follows the enterprise's access level rather than being a free
 * choice: a Monitoring Only enterprise has no management side, so its plants are
 * watched by an EMMSE-0 operative and the role is fixed. Picking EMMSE-0 — by
 * default or by hand — then asks which operative.
 */
function PlantManagerDialog({
  open,
  onOpenChange,
  plantName,
  accessOption,
  existing,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  plantName: string
  accessOption?: string
  existing?: PlantManagerValues
  onSave: (values: PlantManagerValues) => void
}) {
  const locked = roleLockedBy(accessOption)
  const form = useForm<PlantManagerValues>({
    resolver: zodResolver(plantManagerSchema),
    defaultValues: existing ?? { role: roleForAccess(accessOption), emmseId: "", email: "", password: "" },
  })
  const role = form.watch("role")
  const pwd = form.watch("password")

  const submit = form.handleSubmit((values) => {
    onSave(values)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <KeyRound className="size-4 text-primary" /> {existing ? "Edit" : "Add"} Plant Manager
          </DialogTitle>
          <DialogDescription>
            Creates a login for {plantName || "this plant"}. They sign in with this e-mail address.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4" noValidate>
          <SelectField
            control={form.control}
            name="role"
            label="Role"
            required
            options={[...plantManagerRoles]}
            disabled={locked}
            description={locked ? `${accessOption} enterprises are watched by an EMMSE-0 operative.` : undefined}
          />

          {role === "EMMSE-0" ? (
            <SelectField
              control={form.control}
              name="emmseId"
              label="EMMSE-0 Operative"
              required
              options={emmseOperatives.map((o) => ({ value: o.id, label: `${o.name} — ${o.location}` }))}
              placeholder="Select an operative"
            />
          ) : null}

          <TextField control={form.control} name="email" label="Email ID" required type="email" autoComplete="email" />
          <div className="space-y-2">
            <PasswordField control={form.control} name="password" label="Password" required />
            <PasswordStrength value={pwd} />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={submit}><Plus className="size-3.5" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


/**
 * Plant, departments and sub-departments in one step.
 *
 * They are one structure, not three: a department only exists under a plant and
 * a sub-department only under a department, so splitting them across steps made
 * the operator walk forward and back to see what they were attaching to.
 *
 * The plant form is the source of truth for the plant's own fields, and every
 * list action persists `{...plantValues, departments}` together — so a
 * department added before the plant has been "submitted" still has a plant to
 * belong to. The plant's own validation is only enforced on Next.
 *
 * `plantIndex` is which plant in the list the three sections are editing.
 * "Add More Plant" commits the current one and points it at a fresh slot, so an
 * enterprise can be onboarded with several plants in one pass.
 */
export function PlantStructureStep({
  data,
  onPlantsChange,
  onNext,
  onBack,
  onCancel,
  title,
  nextLabel = "Next",
}: ListStepProps & { onCancel?: () => void; title: string; nextLabel?: string }) {
  /* Which plant the three sections below are editing — the last one by default */
  const [plantIndex, setPlantIndex] = useState(Math.max(0, data.plants.length - 1))
  const existing = data.plants[plantIndex]
  const plantForm = useForm<PlantValues>({ resolver: zodResolver(plantSchema), defaultValues: existing ?? blankPlant })
  const deptForm = useForm<DepartmentValues>({ resolver: zodResolver(departmentSchema), defaultValues: blankDepartment })
  const subForm = useForm<SubDepartmentValues>({ resolver: zodResolver(subDepartmentSchema), defaultValues: blankSubDepartment })

  const [editingDept, setEditingDept] = useState<number | null>(null)
  const [editingSub, setEditingSub] = useState<number | null>(null)
  const [deptIndex, setDeptIndex] = useState(0)
  const [deptError, setDeptError] = useState("")
  const [subError, setSubError] = useState("")
  const [managerOpen, setManagerOpen] = useState(false)
  /* Rows the overview shows expanded — the plant just saved, so the operator can
     see its departments survived rather than only an empty form below */
  const [openRows, setOpenRows] = useState<string[] | undefined>()

  const departments = existing?.departments ?? []
  /* Everything already committed, so the operator can see and reopen them */
  const otherPlants = data.plants
  /* A removal in this same step can leave the selection pointing past the end */
  const currentDept = Math.min(deptIndex, Math.max(0, departments.length - 1))
  const dept = departments[currentDept]
  const subs = dept?.subDepartments ?? []
  const manager = existing?.manager

  /* Reading the plant form at write time is what lets the three sections coexist */
  const commit = (departmentList: DepartmentEntry[], values = plantForm.getValues()) => {
    const next = [...data.plants]
    next[plantIndex] = { ...values, departments: departmentList, ...(manager ? { manager } : {}) }
    return next
  }

  /* Saving a manager writes the plant straight away, so the account is not lost
     if the operator moves on without submitting the plant form */
  const saveManager = (values: PlantManagerValues) => {
    const next = [...data.plants]
    next[plantIndex] = { ...plantForm.getValues(), departments, manager: values }
    onPlantsChange(next)
  }

  const writeDepartments = (next: DepartmentEntry[]) => onPlantsChange(commit(next))

  const filled = (v: Record<string, unknown>, keys: string[]) => keys.some((k) => String(v[k] ?? "").trim() !== "")

  /**
   * The departments as they stand, plus anything typed into the two forms but
   * never added with the button.
   *
   * Leaving the plant used to discard those rows, which reads as "I added a
   * department and it vanished" — the operator filled the fields and moved on.
   * Carrying them keeps what was entered.
   */
  const departmentsIncludingTyped = () => {
    let list = departments

    // Sub-department first: it attaches to a department that already exists
    const sv = subForm.getValues()
    if (dept && filled(sv, ["name", "code", "function"])) {
      list = list.map((d, j) =>
        j !== currentDept
          ? d
          : {
              ...d,
              subDepartments:
                editingSub !== null
                  ? d.subDepartments.map((x, k) => (k === editingSub ? sv : x))
                  : [...d.subDepartments, sv],
            }
      )
    }

    const dv = deptForm.getValues()
    if (filled(dv, ["name", "code", "type"])) {
      list =
        editingDept !== null
          ? list.map((d, j) => (j === editingDept ? { ...dv, subDepartments: d.subDepartments } : d))
          : [...list, { ...dv, subDepartments: [] }]
    }

    return list
  }

  /** Clears the three forms so the next plant starts blank */
  const resetForms = () => {
    plantForm.reset(blankPlant)
    deptForm.reset(blankDepartment)
    subForm.reset(blankSubDepartment)
    setEditingDept(null)
    setEditingSub(null)
    setDeptIndex(0)
  }

  /* Saves this plant and opens a fresh one, staying on the step */
  const addAnotherPlant = plantForm.handleSubmit((values) => {
    const next = commit(departmentsIncludingTyped(), values)
    onPlantsChange(next)
    setOpenRows([`plant-${plantIndex}`])
    setPlantIndex(next.length)
    resetForms()
    window.scrollTo({ top: 0 })
  })

  /** Reopens a plant already added, with its own departments */
  const editPlant = (i: number) => {
    setPlantIndex(i)
    plantForm.reset(data.plants[i])
    deptForm.reset(blankDepartment)
    subForm.reset(blankSubDepartment)
    setEditingDept(null)
    setEditingSub(null)
    setDeptIndex(0)
    window.scrollTo({ top: 0 })
  }

  const removePlant = (i: number) => {
    const next = data.plants.filter((_, n) => n !== i)
    onPlantsChange(next)
    // Keep editing something that still exists
    setPlantIndex(Math.min(plantIndex, next.length))
    if (i === plantIndex) resetForms()
  }

  const saveDepartment = deptForm.handleSubmit((values) => {
    // Every field is optional, so an entirely blank row would mean nothing
    if (!values.name?.trim() && !values.code?.trim() && !values.type?.trim()) {
      setDeptError("Enter a name, code or type before adding a department.")
      return
    }
    const next = [...departments]
    if (editingDept !== null) next[editingDept] = { ...values, subDepartments: next[editingDept].subDepartments }
    else next.push({ ...values, subDepartments: [] })
    writeDepartments(next)
    setEditingDept(null)
    setDeptError("")
    deptForm.reset(blankDepartment)
  })

  const removeDepartment = (i: number) => {
    writeDepartments(departments.filter((_, n) => n !== i))
    if (editingDept === i) {
      setEditingDept(null)
      deptForm.reset(blankDepartment)
    }
  }

  const writeSubs = (next: SubDepartmentValues[]) =>
    writeDepartments(departments.map((d, j) => (j === currentDept ? { ...d, subDepartments: next } : d)))

  const saveSubDepartment = subForm.handleSubmit((values) => {
    if (!values.name?.trim() && !values.code?.trim() && !values.function?.trim()) {
      setSubError("Enter a name, code or function before adding a sub-department.")
      return
    }
    const next = [...subs]
    if (editingSub !== null) next[editingSub] = values
    else next.push(values)
    writeSubs(next)
    setEditingSub(null)
    setSubError("")
    subForm.reset(blankSubDepartment)
  })

  const loc = data.location
  return (
    <StepCard
      title={title}
      formId="step-structure"
      nextLabel={nextLabel}
      onBack={onBack}
      onCancel={onCancel}
      extraAction={
        <Button type="button" variant="outline" size="sm" onClick={addAnotherPlant}>
          <Plus /> Add More Plant
        </Button>
      }
    >
      <Context>
        <Ctx icon={Building2} label="Enterprise" value={data.enterprise?.name} />
        <Ctx icon={MapPin} label="Location" value={loc ? `${loc.city}, ${loc.state}, ${loc.country}` : ""} />
      </Context>

      <PlantOverview
        enterprise={data.enterprise?.name}
        plants={otherPlants}
        currentIndex={plantIndex}
        onSelect={editPlant}
        onRemove={removePlant}
        open={openRows}
        onOpenChange={setOpenRows}
      />

      {/* ---------- 1. Plant ---------- */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h4 className="font-semibold">
            1. Plant Details{otherPlants.length > 0 ? ` — plant ${plantIndex + 1}` : ""}
          </h4>
          <p className="text-xs text-muted-foreground">
            Add More Plant saves this one and starts another; Next carries them all forward.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {manager ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserRound className="size-3.5" /> {manager.role}: {manager.email}
            </span>
          ) : null}
          <Button type="button" onClick={() => setManagerOpen(true)}>
            <Plus /> {manager ? "Edit Plant Manager" : "Add Plant Manager"}
          </Button>
        </div>
      </div>
      <form
        id="step-structure"
        onSubmit={plantForm.handleSubmit((values) => {
          onPlantsChange(commit(departmentsIncludingTyped(), values))
          onNext()
        })}
        className="grid gap-2.5 md:grid-cols-3"
        noValidate
      >
        <PlantFields form={plantForm} />
      </form>

      {/* ---------- 2. Departments ---------- */}
      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div>
          <h4 className="font-semibold">
            2. {editingDept !== null ? `Editing department ${editingDept + 1}` : "Departments"}
          </h4>
          <p className="text-xs text-muted-foreground">
            Optional — add as many departments as this plant has, or continue without any.
          </p>
        </div>
        <div className="flex gap-2">
          {editingDept !== null ? (
            <Button type="button" variant="outline" onClick={() => { setEditingDept(null); deptForm.reset(blankDepartment) }}>
              Cancel edit
            </Button>
          ) : null}
          <Button type="button" onClick={saveDepartment}>
            <Plus /> {editingDept !== null ? "Update Department" : "Add Department"}
          </Button>
        </div>
      </div>

      <div className="grid gap-2.5 md:grid-cols-3">
        <DepartmentFields form={deptForm} />
      </div>

      <EntryList
        items={departments}
        editingIndex={editingDept}
        onEdit={(i) => { setEditingDept(i); deptForm.reset(departments[i]) }}
        onRemove={removeDepartment}
        empty="No departments added under this plant yet."
        rowLabel={(d, i) => d.name || `department ${i + 1}`}
        columns={[
          { label: "Department", value: (d) => d.name },
          { label: "Code", value: (d) => d.code },
          { label: "Type", value: (d) => d.type, hideBelow: "sm" },
          { label: "Head", value: (d) => [d.salutation, d.head].filter(Boolean).join(" "), hideBelow: "md" },
          { label: "Sub-depts", value: (d) => String(d.subDepartments.length) },
        ]}
      />
      {deptError ? <p className="mt-2 text-sm text-critical">{deptError}</p> : null}

      {/* ---------- 3. Sub-departments ---------- */}
      <h4 className="mt-6 border-t pt-4 font-semibold">3. Sub-departments</h4>
      <p className="mb-3 text-xs text-muted-foreground">
        Optional — pick a department, then add one or more sub-departments under it.
      </p>

      <div className="sm:max-w-80">
        <Label htmlFor="sub-dept" className="mb-1.5 block text-xs font-medium">Department</Label>
        <Select
          value={departments.length > 0 ? String(currentDept) : undefined}
          onValueChange={(v) => {
            setDeptIndex(Number(v))
            setEditingSub(null)
            subForm.reset(blankSubDepartment)
          }}
          disabled={departments.length === 0}
        >
          <SelectTrigger id="sub-dept" className="w-full">
            <Network className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Add a department above first" />
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

      {dept ? (
        <>
          <div className="mt-3 mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold">
              {editingSub !== null ? `Editing sub-department ${editingSub + 1}` : "New sub-department"} — {dept.name}
            </h4>
            <div className="flex gap-2">
              {editingSub !== null ? (
                <Button type="button" variant="outline" onClick={() => { setEditingSub(null); subForm.reset(blankSubDepartment) }}>
                  Cancel edit
                </Button>
              ) : null}
              <Button type="button" onClick={saveSubDepartment}>
                <Plus /> {editingSub !== null ? "Update Sub-department" : "Add Sub-department"}
              </Button>
            </div>
          </div>

          <div className="grid gap-2.5 md:grid-cols-3">
            <SubDepartmentFields form={subForm} />
          </div>

          <EntryList
            items={subs}
            editingIndex={editingSub}
            onEdit={(i) => { setEditingSub(i); subForm.reset(subs[i]) }}
            onRemove={(i) => {
              writeSubs(subs.filter((_, n) => n !== i))
              if (editingSub === i) {
                setEditingSub(null)
                subForm.reset(blankSubDepartment)
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
          {subError ? <p className="mt-2 text-sm text-critical">{subError}</p> : null}
        </>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Folder className="size-4" />
          Add a department above first — a sub-department sits under one.
        </p>
      )}

      {/* Keyed so each open starts from what is currently saved */}
      <PlantManagerDialog
        key={`${plantIndex}-${managerOpen}`}
        open={managerOpen}
        onOpenChange={setManagerOpen}
        plantName={plantForm.getValues("name")}
        accessOption={data.enterprise?.accessOption}
        existing={manager}
        onSave={saveManager}
      />
    </StepCard>
  )
}
