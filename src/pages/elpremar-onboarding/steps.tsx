import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  Factory,
  FileBadge,
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
import { PasswordRequirements, PasswordStrength } from "@/components/form/password-requirements"
import { designations, elpremarSkills, enterprises, plants, shiftOptions, supervisors } from "@/data/mock"
import {
  basicSchema,
  certificationSchema,
  credentialsSchema,
  workSchema,
  type BasicValues,
  type CertificationValues,
  type CredentialsValues,
  type ElpremarDraft,
  type WorkValues,
} from "./schemas"

const locations = ["Mumbai, Maharashtra", "Jamnagar, Gujarat", "Dolvi, Maharashtra", "Mundra, Gujarat", "Jamshedpur, Jharkhand"]
const departments = ["Electrical", "Maintenance", "Utilities", "Instrumentation"]

/* ---------- shared bits ---------- */

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
      <h3 className="text-lg font-bold text-brand-navy dark:text-foreground">{title}</h3>
      <p className="mb-5 text-sm text-primary">{description}</p>
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

/** Mini profile shown at the start of steps 2 and 3 */
export function ProfileCard({ basic }: { basic?: BasicValues }) {
  return (
    <div className="flex w-full flex-col items-center gap-1 rounded-lg bg-muted/60 p-4 text-center text-xs sm:w-44">
      <Avatar photo={basic?.photo} className="mb-1 size-16" />
      <div className="text-sm font-bold">{basic?.fullName}</div>
      <div>{basic?.employeeId}</div>
      <div>{basic?.department} Department</div>
      <div>{basic?.plant}</div>
    </div>
  )
}

/* ---------- Step 1: Basic Details ---------- */

export function BasicDetailsStep({ draft, onNext, onCancel }: { draft: ElpremarDraft; onNext: (v: BasicValues) => void; onCancel: () => void }) {
  const form = useForm<BasicValues>({
    resolver: zodResolver(basicSchema),
    defaultValues: draft.basic ?? {
      fullName: "", employeeId: "", dob: "", mobile: "", email: "", location: "", plant: "", department: "", supervisor: "", address: "",
    },
  })
  const { control } = form
  return (
    <Card title="Step 1 of 4: Basic Details" description="Enter the basic information of the ELPREMAR.">
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
          <TextField control={control} name="employeeId" label="Employee / ID Number" required placeholder="e.g. EMP-EL-0047" />
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
          <TextField control={control} name="mobile" label="Mobile Number" required type="tel" placeholder="+91 98765 43210" />
          <TextField control={control} name="email" label="Email ID" required type="email" />
          <SelectField control={control} name="location" label="Location" required options={locations} />
          <SelectField control={control} name="plant" label="Plant" required options={plants} />
          <SelectField control={control} name="department" label="Department" required options={departments} />
          <SelectField control={control} name="supervisor" label="Reporting Supervisor" options={supervisors} />
          <TextareaField control={control} name="address" label="Address" optional rows={2} maxLength={250} className="md:col-span-2" />
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
      designation: designations[0], experience: "", shift: "", supervisor: draft.basic?.supervisor ?? "", skills: [], certifications: [],
    },
  })
  const { control, watch, setValue } = form
  const certifications = watch("certifications")
  const [adding, setAdding] = useState(false)
  const cert = useForm<CertificationValues>({ resolver: zodResolver(certificationSchema), defaultValues: { name: "", organisation: "", validTill: "" } })

  const addCertificate = cert.handleSubmit((v) => {
    setValue("certifications", [...certifications, v])
    cert.reset()
    setAdding(false)
  })

  return (
    <Card title="Step 2 of 4: Work & Skills" description="Enter work information, skills and certifications of the ELPREMAR.">
      <form id="elp-work" onSubmit={form.handleSubmit(onNext)} noValidate>
        <div className="flex flex-col gap-5 sm:flex-row">
          <ProfileCard basic={draft.basic} />
          <div className="grid flex-1 gap-4 md:grid-cols-2">
            <SelectField control={control} name="designation" label="Role / Designation" required options={designations} />
            <TextField control={control} name="experience" label="Experience (Years)" required inputMode="numeric" />
            <SelectField control={control} name="shift" label="Shift Preference" required options={shiftOptions} />
            <SelectField control={control} name="supervisor" label="Reporting Supervisor" required options={supervisors} />
          </div>
        </div>

        <Controller
          control={control}
          name="skills"
          render={({ field, fieldState }) => (
            <div className="mt-5 rounded-lg bg-info-soft/60 p-4">
              <h4 className="flex items-center gap-2 font-semibold"><Settings className="size-5 text-primary" /> Skills &amp; Competencies</h4>
              <p className="mb-3 text-xs text-muted-foreground">Select the key skills and areas of expertise (multiple selection allowed).</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[...elpremarSkills, "Other"].map((skill) => {
                  const checked = field.value.includes(skill)
                  return (
                    <div key={skill} className="flex items-center gap-2">
                      <Checkbox
                        id={`skill-${skill}`}
                        checked={checked}
                        onCheckedChange={(c) => field.onChange(c ? [...field.value, skill] : field.value.filter((s) => s !== skill))}
                      />
                      <Label htmlFor={`skill-${skill}`} className="font-normal">{skill}</Label>
                    </div>
                  )
                })}
              </div>
              {fieldState.error ? <p className="mt-2 text-sm text-critical">{fieldState.error.message}</p> : null}
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
              <TableHead>Issuing Organization</TableHead>
              <TableHead>Valid Till</TableHead>
              <TableHead className="w-24 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certifications.map((c, i) => (
              <TableRow key={c.name + i}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.organisation}</TableCell>
                <TableCell>{c.validTill.split("-").reverse().join("-")}</TableCell>
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
                <TableCell><Input placeholder="Organisation" {...cert.register("organisation")} aria-invalid={!!cert.formState.errors.organisation} /></TableCell>
                <TableCell><Input type="date" {...cert.register("validTill")} aria-invalid={!!cert.formState.errors.validTill} /></TableCell>
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

/* ---------- Step 3: Account Credentials ---------- */

export function CredentialsStep({ draft, onNext, onBack }: { draft: ElpremarDraft; onNext: (v: CredentialsValues) => void; onBack: () => void }) {
  const suggested = draft.basic?.fullName.trim().toLowerCase().replace(/\s+/g, ".") ?? ""
  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: draft.credentials ?? {
      username: suggested, role: "ELPREMAR", password: "", confirmPassword: "", webAccess: true, mobileAccess: true, sendWelcomeEmail: false,
    },
    mode: "onChange",
  })
  const { control, watch } = form
  const pwd = watch("password")
  const confirm = watch("confirmPassword")
  const basic = draft.basic

  const access = [
    { name: "webAccess" as const, label: "Allow Web Portal Access", hint: "Access to EMMS-E / OCC web application" },
    { name: "mobileAccess" as const, label: "Allow Mobile App Access", hint: "Access to EVITA field application" },
    { name: "sendWelcomeEmail" as const, label: "Send Welcome Email", hint: "Send login credentials to the employee's email ID" },
  ]

  return (
    <Card title="Step 3 of 4: Account Credentials" description="Create a username and password for the ELPREMAR to access the system.">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row">
        <ProfileCard basic={basic} />
        <div className="grid flex-1 grid-cols-2 gap-3 self-start rounded-lg bg-info-soft/60 p-4 text-sm md:grid-cols-4">
          {[
            { icon: Building2, label: "Enterprise", value: enterprises[0] },
            { icon: Factory, label: "Plant", value: basic?.plant },
            { icon: Network, label: "Department", value: basic?.department },
            { icon: UserRound, label: "Reporting To", value: draft.work?.supervisor },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div><div className="font-medium">{label}</div><div className="text-xs text-muted-foreground">{value}</div></div>
            </div>
          ))}
        </div>
      </div>

      <form id="elp-credentials" onSubmit={form.handleSubmit(onNext)} className="rounded-lg ring-1 ring-border" noValidate>
        <h4 className="flex items-center gap-2 border-b bg-info-soft/60 px-4 py-2 font-semibold"><UserRoundCheck className="size-5 text-primary" /> System Access Details</h4>
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <TextField control={control} name="username" label="Username" required description="Username must be at least 6 characters. (Recommended format: firstname.lastname)" />
          <div>
            <SelectField control={control} name="role" label="User Role" required options={["ELPREMAR", "Senior ELPREMAR", "Team Leader"]} />
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
  const { basic, work, credentials } = draft
  return (
    <section className="rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-brand-navy dark:text-foreground">Step 4 of 4: Review &amp; Submit</h3>
          <p className="text-sm text-primary">Verify the details below before completing the onboarding. You can edit the information if needed.</p>
        </div>
        <Button variant="outline" className="text-primary" onClick={() => onEdit(0)}><Pencil /> Edit Details</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
              <Row label="Address" value={basic?.address} />
              <Row label="Location" value={basic?.location} />
              <Row label="Plant" value={basic?.plant} />
              <Row label="Department" value={basic?.department} />
              <Row label="Reporting Supervisor" value={basic?.supervisor} />
            </div>
          </div>
        </ReviewSection>

        <ReviewSection icon={Settings} title="2. Work & Skills" onEdit={() => onEdit(1)}>
          <Row label="Role / Designation" value={work?.designation} />
          <Row label="Experience" value={work ? `${work.experience} Years` : ""} />
          <Row label="Shift Preference" value={work?.shift} />
          <div className="pt-2 text-sm font-semibold">Skills &amp; Competencies</div>
          <div className="grid gap-1 sm:grid-cols-2">
            {elpremarSkills.map((s) => {
              const has = work?.skills.includes(s)
              return (
                <span key={s} className={cn("flex items-center gap-1.5 text-xs", !has && "text-muted-foreground")}>
                  {has ? <CheckCircle2 className="size-4 text-healthy" /> : <Circle className="size-4" />} {s}
                </span>
              )
            })}
          </div>
          <div className="pt-2 text-sm font-semibold">Certifications &amp; Training</div>
          {work?.certifications.length ? (
            <ol className="ml-5 list-decimal space-y-0.5 text-xs">
              {work.certifications.map((c) => (
                <li key={c.name}>
                  {c.name} <span className="text-muted-foreground">(Valid till: {c.validTill.split("-").reverse().join("-")})</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-xs text-muted-foreground">None added</p>}
        </ReviewSection>

        <ReviewSection icon={Lock} title="3. Account Credentials" onEdit={() => onEdit(2)}>
          <Row label="Username" value={credentials?.username} />
          <Row label="User Role" value={credentials?.role} />
          <Row label="Password" value={<span className="flex items-center gap-2">•••••••• <span className="text-xs text-healthy-soft-foreground">Secure</span></span>} />
          <Row
            label="Login Access"
            value={[credentials?.webAccess && "Web Portal", credentials?.mobileAccess && "Mobile App"].filter(Boolean).join(", ")}
          />
        </ReviewSection>

        <ReviewSection icon={Settings} title="Additional Settings">
          <Row label="Send Welcome Email" value={credentials?.sendWelcomeEmail ? "Yes" : "No"} />
          <Row label="Send SMS Notification" value="Yes" />
          <Row label="Account Status" value="Active (After Submission)" />
          <Row label="Access Start Date" value="Immediately" />
        </ReviewSection>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" size="lg" onClick={onBack}><ArrowLeft /> Back</Button>
        <Button size="lg" onClick={onSubmit}>Submit &amp; Complete Onboarding <Check /></Button>
      </div>
    </section>
  )
}
