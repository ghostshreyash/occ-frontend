import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Factory,
  FileBadge,
  HardHat,
  KeyRound,
  Lock,
  Network,
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserRound,
  UserRoundCheck,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PasswordField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { Context, Ctx } from "@/components/common/wizard"
import { Attachments } from "@/components/form/attachments"
import { PasswordRequirements, PasswordStrength } from "@/components/form/password-requirements"
import { elpremarDesignations, elpremarRoles, roleStream, userRoles } from "@/data/master-data"
import { enterpriseRecords, profileFor } from "@/data/occ-tables"
import { nextElpremarId } from "@/data/elpremar-data"
import {
  assignmentSchema,
  basicSchema,
  certificationSchema,
  credentialsSchema,
  workSchema,
  type AssignmentValues,
  type BasicValues,
  type CertificationValues,
  type CredentialsValues,
  type ElpremarDraft,
  type WorkValues,
} from "./schemas"


/* ---------- shared bits ---------- */

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-card p-3 shadow-xs ring-1 ring-foreground/10 transition-shadow duration-200 ease-out hover:shadow-md">
      <h3 className="mb-2.5 text-sm font-bold text-brand-navy dark:text-foreground">{title}</h3>
      {description ? <p className="-mt-2 mb-2.5 text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </section>
  )
}

function Footer({ onBack, onCancel, nextLabel = "Next", formId, nextIcon = <ArrowRight /> }: {
  onBack?: () => void
  onCancel?: () => void
  nextLabel?: string
  formId: string
  nextIcon?: React.ReactNode
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {onCancel ? (
        <Button type="button" variant="outline" size="lg" className="min-w-28" onClick={onCancel}>Cancel</Button>
      ) : <span />}
      <div className="flex gap-3">
        {onBack ? (
          <Button type="button" variant="outline" size="lg" onClick={onBack}><ArrowLeft /> Back</Button>
        ) : null}
        <Button type="submit" form={formId} size="lg" className="min-w-32">{nextLabel} {nextIcon}</Button>
      </div>
    </div>
  )
}

function Avatar({ photo, className }: { photo?: File; className?: string }) {
  const url = photo ? URL.createObjectURL(photo) : undefined
  return (
    <div className={cn("flex items-center justify-center overflow-hidden rounded-full bg-muted", className)}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <UserRound className="size-1/2 text-muted-foreground" />}
    </div>
  )
}

/**
 * What earlier steps established, carried across the top of each later step.
 * The portrait is not repeated here - it belongs with the upload in Step 1 and
 * with the review at the end.
 */
function ElpremarContext({ draft }: { draft: ElpremarDraft }) {
  const { basic, work, assignment } = draft
  return (
    <Context>
      <Ctx icon={UserRound} label="ELPREMAR" value={basic?.fullName} />
      <Ctx icon={FileBadge} label="Employee ID" value={basic?.employeeId} />
      <Ctx icon={HardHat} label="Role" value={work ? roleStream(work.designation) : undefined} />
      <Ctx icon={Building2} label="Enterprise" value={assignment?.enterprise} />
      <Ctx icon={Factory} label="Plant" value={assignment?.plant} />
    </Context>
  )
}

/* ---------- Step 1: Basic Details ---------- */

export function BasicDetailsStep({ draft, onNext, onCancel }: { draft: ElpremarDraft; onNext: (v: BasicValues) => void; onCancel: () => void }) {
  const form = useForm<BasicValues>({
    resolver: zodResolver(basicSchema),
    defaultValues: draft.basic ?? {
      fullName: "", employeeId: nextElpremarId(), dob: "", mobile: "", email: "", postalCode: "", address: "",
    },
  })
  const { control } = form
  return (
    <Card title="Step 1 of 5: Basic Details">
      <form id="elp-basic" onSubmit={form.handleSubmit(onNext)} className="flex flex-col gap-5 sm:flex-row" noValidate>
        <Controller
          control={control}
          name="photo"
          render={({ field }) => (
            <div className="flex w-full shrink-0 flex-col items-center gap-2 self-start rounded-lg bg-muted/60 p-4 sm:w-36">
              <Avatar photo={field.value} className="size-24" />
              <label className="cursor-pointer rounded-md border bg-card px-3 py-1 text-xs font-medium text-primary hover:bg-accent">
                Upload Photo
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => field.onChange(e.target.files?.[0])} />
              </label>
              <span className="text-[0.7rem] text-muted-foreground">JPG/PNG (Max 2 MB)</span>
            </div>
          )}
        />
        <div className="grid flex-1 gap-4 md:grid-cols-2">
          <TextField control={control} name="fullName" label="Full Name" required />
          <TextField
            control={control}
            name="employeeId"
            label="Employee / ID Number"
            required
            readOnly
            inputClassName="bg-muted/60"
            description="Issued automatically — the next free ID"
          />
          <TextField control={control} name="dob" label="Date of Birth" required type="date" />
          <Controller
            control={control}
            name="gender"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="gap-1">Gender<span className="text-critical">*</span></FieldLabel>
                <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="flex h-9 items-center gap-6">
                  {["Male", "Female", "Other"].map((g) => (
                    <div key={g} className="flex items-center gap-2">
                      <RadioGroupItem value={g} id={`gender-${g}`} />
                      <Label htmlFor={`gender-${g}`} className="font-normal">{g}</Label>
                    </div>
                  ))}
                </RadioGroup>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <TextField control={control} name="postalCode" label="Postal Code" inputMode="numeric" placeholder="e.g. 400001" />
          <TextField control={control} name="mobile" label="Mobile Number" required type="tel" placeholder="+91 98765 43210" />
          <TextField control={control} name="email" label="Email ID" required type="email" />
          <TextareaField control={control} name="address" label="Address" rows={2} maxLength={250} className="md:col-span-2" />
        </div>
      </form>
      <Footer formId="elp-basic" onCancel={onCancel} />
    </Card>
  )
}

/* ---------- Step 2: Work & Skills ---------- */

export function WorkSkillsStep({ draft, onNext, onBack }: { draft: ElpremarDraft; onNext: (v: WorkValues) => void; onBack: () => void }) {
  const form = useForm<WorkValues>({
    resolver: zodResolver(workSchema),
    defaultValues: draft.work ?? {
      roles: [], designation: "", experience: "", certifications: [], kycDocuments: [],
    },
  })
  const { control, watch, setValue } = form
  const certifications = watch("certifications")
  const [adding, setAdding] = useState(false)
  const cert = useForm<CertificationValues>({ resolver: zodResolver(certificationSchema), defaultValues: { name: "", number: "", organisation: "", certificateId: "", validTill: "", documents: [] } })

  const addCertificate = cert.handleSubmit((v) => {
    setValue("certifications", [...certifications, v])
    cert.reset()
    setAdding(false)
  })

  return (
    <Card title="Step 2 of 5: Work &amp; Role">
      <form id="elp-work" onSubmit={form.handleSubmit(onNext)} noValidate>
        <ElpremarContext draft={draft} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField control={control} name="designation" label="Designation" required options={[...elpremarDesignations]} />
          <TextField control={control} name="experience" label="Experience (Years)" required inputMode="numeric" />
        </div>

        <Controller
          control={control}
          name="roles"
          render={({ field, fieldState }) => (
            <div className="mt-5 rounded-lg bg-info-soft/60 p-4">
              <h4 className="flex items-center gap-2 font-semibold"><HardHat className="size-5 text-primary" /> Role</h4>
              <p className="mb-3 text-xs text-muted-foreground">
                Which streams this ELPREMAR is certified to work on. More than one may apply.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {elpremarRoles.map((r) => {
                  const checked = field.value.includes(r)
                  return (
                    <div key={r} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${r}`}
                        checked={checked}
                        onCheckedChange={(c) => field.onChange(c ? [...field.value, r] : field.value.filter((v) => v !== r))}
                      />
                      <Label htmlFor={`role-${r}`} className="font-normal">{roleStream(r)}</Label>
                    </div>
                  )
                })}
              </div>
              {fieldState.error ? <p className="mt-2 text-sm text-critical">{fieldState.error.message}</p> : null}
            </div>
          )}
        />

        <Controller
          control={control}
          name="kycDocuments"
          render={({ field }) => (
            <div className="mt-5 rounded-lg ring-1 ring-border p-4">
              <h4 className="flex items-center gap-2 font-semibold"><FileBadge className="size-5 text-primary" /> Identity Documents</h4>
              <p className="mb-3 text-xs text-muted-foreground">KYC and identity proof. More than one file may be attached.</p>
              <Attachments files={field.value} onChange={field.onChange} inputId="kyc-upload" />
            </div>
          )}
        />
      </form>

      <div className="mt-5 rounded-lg ring-1 ring-border">
        <div className="p-4 pb-2">
          <h4 className="flex items-center gap-2 font-semibold"><FileBadge className="size-5 text-primary" /> Certifications &amp; Training</h4>
          <p className="text-xs text-muted-foreground">Add relevant certifications and training completed.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/70">
              <TableHead className="w-10">#</TableHead>
              <TableHead>Certificate / Training Name</TableHead>
              <TableHead>Certificate No.</TableHead>
              <TableHead>Issuing Organization</TableHead>
              <TableHead>Valid Till</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="w-24 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certifications.map((c, i) => (
              <TableRow key={c.name + i}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell className="tabular-nums">{c.number}</TableCell>
                <TableCell>{c.organisation}</TableCell>
                <TableCell>{c.validTill.split("-").reverse().join("-")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.documents.length ? `${c.documents.length} file${c.documents.length > 1 ? "s" : ""}` : "None"}
                </TableCell>
                <TableCell className="text-center">
                  <Button type="button" variant="ghost" size="icon-sm" className="text-primary" aria-label="Edit"
                    onClick={() => { cert.reset(c); setValue("certifications", certifications.filter((_, j) => j !== i)); setAdding(true) }}>
                    <Pencil />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" className="text-critical" aria-label="Delete"
                    onClick={() => setValue("certifications", certifications.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {adding ? (
              <TableRow>
                <TableCell>{certifications.length + 1}</TableCell>
                <TableCell><Input placeholder="Certificate name" {...cert.register("name")} aria-invalid={!!cert.formState.errors.name} /></TableCell>
                <TableCell><Input placeholder="Certificate no." {...cert.register("number")} aria-invalid={!!cert.formState.errors.number} /></TableCell>
                <TableCell><Input placeholder="Organisation" {...cert.register("organisation")} aria-invalid={!!cert.formState.errors.organisation} /></TableCell>
                <TableCell><Input type="date" {...cert.register("validTill")} aria-invalid={!!cert.formState.errors.validTill} /></TableCell>
                <TableCell>
                  <Controller
                    control={cert.control}
                    name="documents"
                    render={({ field }) => <Attachments files={field.value} onChange={field.onChange} inputId="cert-upload" compact />}
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Button type="button" size="icon-sm" aria-label="Save certificate" onClick={addCertificate}><Check /></Button>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
        <div className="p-3">
          <Button type="button" variant="outline" size="sm" className="text-primary" onClick={() => setAdding(true)} disabled={adding}>
            <Plus /> Add Certificate / Training
          </Button>
        </div>
      </div>
      <Footer formId="elp-work" onBack={onBack} />
    </Card>
  )
}

/* ---------- Step 3: Assign Enterprise ---------- */

/**
 * Assigns the ELPREMAR to an enterprise that already exists. Every list is read
 * from that enterprise's own hierarchy, so a posting can only ever name a plant,
 * department and supervisor that are really there - nothing is created here.
 */
export function AssignEnterpriseStep({ draft, onNext, onBack }: { draft: ElpremarDraft; onNext: (v: AssignmentValues) => void; onBack: () => void }) {
  const form = useForm<AssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: draft.assignment ?? {
      enterprise: "", plant: "", department: "", subDepartment: "", supervisor: "", effectiveFrom: "",
    },
  })
  const { control, watch, setValue } = form

  // Each level is narrowed by the one above it
  const record = enterpriseRecords.find((e) => e.name === watch("enterprise"))
  const plants = record ? profileFor(record).plants : []
  const plant = plants.find((p) => p.name === watch("plant"))
  const departments = plant?.departments ?? []
  const department = departments.find((d) => d.name === watch("department"))
  const subDepartments = department?.subDepartments ?? []

  // The real reporting line: the department head, with the plant head above them
  const named = (salutation: string, head: string) => `${salutation} ${head}`
  const supervisorOptions = [
    ...(department ? [named(department.salutation, department.head)] : []),
    ...(plant ? [named(plant.salutation, plant.head)] : []),
  ].filter((v, i, a) => a.indexOf(v) === i)

  const clear = (...names: (keyof AssignmentValues)[]) => names.forEach((n) => setValue(n, ""))

  return (
    <Card
      title="Step 3 of 5: Assign Enterprise"
      description="Post this ELPREMAR to an existing enterprise. Pick the plant and department they will work under."
    >
      <form id="elp-assign" onSubmit={form.handleSubmit(onNext)} noValidate>
        <ElpremarContext draft={draft} />
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            control={control}
            name="enterprise"
            label="Enterprise"
            required
            options={enterpriseRecords.map((e) => e.name)}
            onValueChange={() => clear("plant", "department", "subDepartment", "supervisor")}
          />
          <SelectField
            control={control}
            name="plant"
            label="Plant"
            required
            disabled={!record}
            placeholder={record ? "Select" : "Select an enterprise first"}
            options={plants.map((p) => p.name)}
            onValueChange={() => clear("department", "subDepartment", "supervisor")}
          />
          <SelectField
            control={control}
            name="department"
            label="Department"
            required
            disabled={!plant}
            placeholder={plant ? "Select" : "Select a plant first"}
            options={departments.map((d) => d.name)}
            onValueChange={() => clear("subDepartment", "supervisor")}
          />
          <SelectField
            control={control}
            name="subDepartment"
            label="Sub-Department"
            disabled={!department}
            placeholder={department ? "Select" : "Select a department first"}
            options={subDepartments.map((s) => s.name)}
          />
          <SelectField
            control={control}
            name="supervisor"
            label="Reporting Supervisor"
            required
            disabled={!department}
            placeholder={department ? "Select" : "Select a department first"}
            options={supervisorOptions}
          />
          <TextField control={control} name="effectiveFrom" label="Effective From" required type="date" />
        </div>

        {record ? (
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg bg-info-soft/60 p-4 text-xs">
            <span className="flex items-center gap-1.5 font-semibold"><Building2 className="size-4 text-primary" /> {record.name}</span>
            <span className="text-muted-foreground">{record.sectorType} · {record.sector}</span>
            <span className="flex items-center gap-1.5"><Factory className="size-4 text-primary" /> {record.plants} plants</span>
            <span className="flex items-center gap-1.5"><Network className="size-4 text-primary" /> {record.city}, {record.country}</span>
          </div>
        ) : null}
      </form>
      <Footer formId="elp-assign" onBack={onBack} />
    </Card>
  )
}

/* ---------- Step 3: Account Credentials ---------- */

export function CredentialsStep({ draft, onNext, onBack }: { draft: ElpremarDraft; onNext: (v: CredentialsValues) => void; onBack: () => void }) {
  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: draft.credentials ?? {
      email: draft.basic?.email ?? "", role: "ELPREMAR", password: "", confirmPassword: "", webAccess: true, mobileAccess: true, sendWelcomeEmail: false,
    },
    mode: "onChange",
  })
  const { control, watch } = form
  const pwd = watch("password")
  const confirm = watch("confirmPassword")

  const access = [
    { name: "webAccess" as const, label: "Allow Web Portal Access", hint: "Access to EMMS-E / OCC web application" },
    { name: "mobileAccess" as const, label: "Allow Mobile App Access", hint: "Access to EVITA field application" },
    { name: "sendWelcomeEmail" as const, label: "Send Welcome Email", hint: "Send login credentials to the employee's email ID" },
  ]

  return (
    <Card title="Step 4 of 5: Account Credentials">
      <ElpremarContext draft={draft} />

      <form id="elp-credentials" onSubmit={form.handleSubmit(onNext)} className="rounded-lg ring-1 ring-border" noValidate>
        <h4 className="flex items-center gap-2 border-b bg-info-soft/60 px-4 py-2 font-semibold"><UserRoundCheck className="size-5 text-primary" /> System Access Details</h4>
        <div className="grid gap-2.5 p-3 md:grid-cols-2">
          <TextField control={control} name="email" label="Email ID" required type="email" description="Taken from Basic Details. This is what they sign in with - change it here if their login differs." />
          <div>
            <SelectField control={control} name="role" label="User Role" required options={[...userRoles]} />
            <p className="mt-2 rounded-md bg-muted/60 p-2 text-xs text-muted-foreground">
              Access to maintenance activities, checklist updates, asset condition reporting and availability.
            </p>
          </div>
          <div className="space-y-2">
            <PasswordField control={control} name="password" label="Password" required />
            <PasswordStrength value={pwd} />
            <p className="text-xs text-muted-foreground">Minimum 8 characters with a mix of letters, numbers and special characters.</p>
          </div>
          <div>
            <PasswordField control={control} name="confirmPassword" label="Confirm Password" required />
            {confirm && confirm === pwd ? <p className="mt-1 text-xs font-medium text-healthy-soft-foreground">Passwords match.</p> : null}
          </div>

          <div className="rounded-lg bg-muted/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-primary" /> Login Access</div>
            <div className="space-y-2">
              {access.map((a) => (
                <Controller
                  key={a.name}
                  control={control}
                  name={a.name}
                  render={({ field }) => (
                    <div className="flex items-start gap-2">
                      <Checkbox id={a.name} checked={field.value} onCheckedChange={(c) => field.onChange(c === true)} className="mt-0.5" />
                      <Label htmlFor={a.name} className="flex flex-col items-start gap-0">
                        <span>{a.label}</span>
                        <span className="text-xs font-normal text-muted-foreground">{a.hint}</span>
                      </Label>
                    </div>
                  )}
                />
              ))}
            </div>
            {form.formState.errors.webAccess ? <p className="mt-2 text-xs text-critical">{form.formState.errors.webAccess.message}</p> : null}
          </div>
          <div className="[&>div]:h-full">
            <div className="flex items-start gap-2 rounded-lg">
              <Lock className="mt-3 ml-1 size-4 shrink-0 text-primary" />
              <div className="flex-1"><PasswordRequirements value={pwd} /></div>
            </div>
          </div>
        </div>
      </form>
      <Footer formId="elp-credentials" onBack={onBack} />
    </Card>
  )
}

/* ---------- Step 4: Review & Submit ---------- */

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_auto_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>:<span className="font-medium">{value || "—"}</span>
    </div>
  )
}

function ReviewSection({ icon: Icon, title, children, onEdit }: { icon: typeof UserRound; title: string; children: React.ReactNode; onEdit?: () => void }) {
  return (
    <section className="rounded-lg ring-1 ring-border">
      <h4 className="flex items-center justify-between gap-2 border-b bg-info-soft/60 px-4 py-2 font-semibold">
        <span className="flex items-center gap-2"><Icon className="size-5 text-primary" /> {title}</span>
        {onEdit ? <Button type="button" variant="link" size="xs" onClick={onEdit}><Pencil /> Edit</Button> : null}
      </h4>
      <div className="space-y-1.5 p-4">{children}</div>
    </section>
  )
}

export function ReviewStep({ draft, onBack, onEdit, onSubmit }: { draft: ElpremarDraft; onBack: () => void; onEdit: (step: number) => void; onSubmit: () => void }) {
  const { basic, work, assignment, credentials } = draft
  return (
    <section className="rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-brand-navy dark:text-foreground">Step 5 of 5: Review &amp; Submit</h3>
          <p className="text-sm text-primary">Verify the details below before completing the onboarding. You can edit the information if needed.</p>
        </div>
        <Button variant="outline" className="text-primary" onClick={() => onEdit(0)}><Pencil /> Edit Details</Button>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <ReviewSection icon={UserRound} title="1. Basic Details" onEdit={() => onEdit(0)}>
          <div className="flex gap-4">
            <Avatar photo={basic?.photo} className="size-20 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Row label="Full Name" value={basic?.fullName} />
              <Row label="Employee ID" value={basic?.employeeId} />
              <Row label="Date of Birth" value={basic?.dob.split("-").reverse().join("-")} />
              <Row label="Gender" value={basic?.gender} />
              <Row label="Mobile Number" value={basic?.mobile} />
              <Row label="Email ID" value={basic?.email} />
              <Row label="Postal Code" value={basic?.postalCode} />
              <Row label="Address" value={basic?.address} />
            </div>
          </div>
        </ReviewSection>

        <ReviewSection icon={Settings} title="2. Work &amp; Role" onEdit={() => onEdit(1)}>
          <Row label="Designation" value={work?.designation} />
          <Row label="Role" value={work?.roles.map(roleStream).join(", ")} />
          <Row label="Experience" value={work ? `${work.experience} Years` : ""} />

          <div className="pt-2 text-sm font-semibold">Certifications &amp; Training</div>
          {work?.certifications.length ? (
            <ol className="ml-5 list-decimal space-y-0.5 text-xs">
              {work.certifications.map((c) => (
                <li key={c.name}>
                  {c.name} <span className="text-muted-foreground">
                    (No: {c.number} - valid till {c.validTill.split("-").reverse().join("-")}
                    {c.documents.length ? `, ${c.documents.length} document(s)` : ""})
                  </span>
                </li>
              ))}
            </ol>
          ) : <p className="text-xs text-muted-foreground">None added</p>}

          <div className="pt-2 text-sm font-semibold">Identity Documents</div>
          {work?.kycDocuments.length ? (
            <ul className="ml-5 list-disc space-y-0.5 text-xs">
              {work.kycDocuments.map((f) => <li key={f.name}>{f.name}</li>)}
            </ul>
          ) : <p className="text-xs text-muted-foreground">None attached</p>}
        </ReviewSection>

        <ReviewSection icon={Building2} title="3. Enterprise Assignment" onEdit={() => onEdit(2)}>
          <Row label="Enterprise" value={assignment?.enterprise} />
          <Row label="Plant" value={assignment?.plant} />
          <Row label="Department" value={assignment?.department} />
          <Row label="Sub-Department" value={assignment?.subDepartment} />
          <Row label="Reporting To" value={assignment?.supervisor} />
          <Row label="Effective From" value={assignment?.effectiveFrom.split("-").reverse().join("-")} />
        </ReviewSection>

        <ReviewSection icon={Lock} title="4. Account Credentials" onEdit={() => onEdit(3)}>
          <Row label="Email ID" value={credentials?.email} />
          <Row label="User Role" value={credentials?.role} />
          <Row label="Password" value={<span className="flex items-center gap-2">•••••••• <span className="text-xs text-healthy-soft-foreground">Secure</span></span>} />
          <Row
            label="Login Access"
            value={[credentials?.webAccess && "Web Portal", credentials?.mobileAccess && "Mobile App"].filter(Boolean).join(", ")}
          />
        </ReviewSection>

      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="lg" onClick={onBack}><ArrowLeft /> Back</Button>
        <Button size="lg" onClick={onSubmit}>Submit &amp; Complete Onboarding <Check /></Button>
      </div>
    </section>
  )
}
