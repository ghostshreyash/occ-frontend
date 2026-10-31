import { useCallback, useState } from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { useForm, type FieldValues, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, isValid, parseISO } from "date-fns"
import {
  ArrowLeft,
  Award,
  Building2,
  HardHat,
  ClipboardList,
  KeyRound,
  LifeBuoy,
  Wrench,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateField, PhoneField, SelectField, TextField } from "@/components/form/fields"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { ChangePasswordDialog } from "@/components/common/change-password-dialog"
import { DetailSection, ValueGrid } from "@/components/common/detail-section"
import { ErrorNotice } from "@/components/common/data-state"
import { ExpiryValue } from "@/components/common/expiry-value"
import { slotLabel } from "@/data/occ-tables"
import { elpremarStatusMeta, upcomingFor, whenLabel } from "@/data/elpremar-data"
import { getEnterprise, listEnterprises, type EnterpriseRow } from "@/lib/api/enterprises"
import {
  basicPatch,
  getElpremar,
  updateElpremar,
  workPatch,
  type ElpremarProfileData,
} from "@/lib/api/elpremars"
import { messageFor, useResource } from "@/lib/api/use-resource"
import { areaForPostalCode, elpremarDesignations, elpremarRoles, roleStream, userRoles } from "@/data/master-data"
import { countries, salutations } from "@/data/mock"
import { POSTAL_CODE_MAX_LENGTH, optionalEmail, optionalPostalCode, phone, required } from "@/lib/validation"

const th = "h-8 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"

/** ISO date in state, readable date on screen */
const showDate = (iso?: string) => {
  if (!iso) return undefined
  const d = parseISO(iso)
  return isValid(d) ? format(d, "dd MMM yyyy") : iso
}

/* ---------- Section schemas ---------- */

const basicSchema = z.object({
  salutation: required("Title"),
  name: required("Full name"),
  employeeId: required("Employee ID"),
  dob: z.string().optional(),
  gender: z.string().optional(),
  postalCode: optionalPostalCode,
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  phoneCode: z.string().optional(),
  phone,
  email: z.email("Enter a valid email address"),
})
type BasicValues = z.infer<typeof basicSchema>

const postingSchema = z.object({
  enterprise: z.string().optional(),
  plant: z.string().optional(),
  city: required("City"),
  country: required("Country"),
  department: z.string().optional(),
  subDepartment: z.string().optional(),
  supervisor: z.string().optional(),
  effectiveFrom: z.string().optional(),
})
type PostingValues = z.infer<typeof postingSchema>

const workSchema = z.object({
  roles: z.array(z.string()).min(1, "Select at least one role"),
  designation: required("Designation"),
  experience: z.string().regex(/^\d{1,2}$/, "Enter years of experience"),
})
type WorkValues = z.infer<typeof workSchema>

const accountSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: required("User role"),
  webAccess: z.boolean(),
  mobileAccess: z.boolean(),
  contactEmail: optionalEmail,
})
type AccountValues = z.infer<typeof accountSchema>

/**
 * The account section as the API takes it.
 *
 * `contactEmail` is a second address the form carries and the API has no field
 * for, so it is not sent. The access toggles are sent and the API currently
 * reads them back as allowed either way - see `src/lib/api/elpremars.ts`.
 */
const accountPatch = (values: AccountValues) => ({
  email: values.email,
  role: values.role,
  webAccess: values.webAccess,
  mobileAccess: values.mobileAccess,
})

/** ELPREMAR detail: the full onboarding profile, editable, plus their assigned work */
/** Icon and tint per activity kind, matching the three work cards above */
const ACTIVITY_KINDS = {
  Maintenance: { icon: Wrench, tone: "bg-info-soft text-info" },
  Inspection: { icon: ClipboardList, tone: "bg-highlight-soft text-highlight" },
  Support: { icon: LifeBuoy, tone: "bg-attention-soft text-attention" },
} as const

/** Which section a PATCH covers, so a save knows what to send */
type Section = "basic" | "posting" | "work" | "account"

/**
 * The empty enterprise list, as one value - `data?.rows ?? []` would be a new
 * array every render and the posting menus would rebuild with it.
 */
const NO_ENTERPRISES: EnterpriseRow[] = []

export function ElpremarDetailPage() {
  const { id = "" } = useParams()

  const [editing, setEditing] = useState<string | null>(null)
  /** Which section is being saved, so its footer says so and locks */
  const [saving, setSaving] = useState<Section | null>(null)
  const [resettingPassword, setResettingPassword] = useState(false)

  /*
   * The profile comes from the API and goes back to it. There are no local
   * overrides: a save PATCHes the section and re-reads, so what is on screen is
   * what the server stored - which matters here because the API re-parses the
   * address into its lines and reissues the formatted dates.
   */
  const read = useCallback(() => getElpremar(id), [id])
  const { data: profile, error, loading, reload } = useResource(read)

  /*
   * The posting menus are read from the register and from the chosen
   * enterprise's own tree, the same two calls the onboarding step makes - the
   * plant, department and sub-department offered always exist under it.
   */
  const readRegister = useCallback(() => listEnterprises(), [])
  const register = useResource(readRegister)
  const enterprises = register.data?.rows ?? NO_ENTERPRISES

  const basicForm = useForm<BasicValues>({ resolver: zodResolver(basicSchema), values: profile?.basic })
  const postingForm = useForm<PostingValues>({ resolver: zodResolver(postingSchema), values: profile?.posting })
  const workForm = useForm<WorkValues>({ resolver: zodResolver(workSchema), values: profile?.work })
  const accountForm = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    values: profile ? { ...profile.account, contactEmail: "" } : undefined,
  })

  const postedEnterprise = enterprises.find((e) => e.name === postingForm.watch("enterprise"))
  const postedEnterpriseId = postedEnterprise?.id
  const readTree = useCallback(
    () => (postedEnterpriseId ? getEnterprise(postedEnterpriseId) : Promise.resolve(undefined)),
    [postedEnterpriseId]
  )
  const tree = useResource(readTree)

  /**
   * Saves one section.
   *
   * Each goes to the API under the name the endpoint knows it by, so only the
   * fields in that section travel and nothing the operator did not open is
   * touched. A failure leaves the form open with the values still in it.
   */
  const save =
    <T extends FieldValues>(form: UseFormReturn<T>, section: Section) =>
    () => {
      void form.handleSubmit(async (values) => {
        setSaving(section)
        try {
          await updateElpremar(
            id,
            section === "work"
              ? workPatch(values as unknown as WorkValues)
              : section === "account"
                ? { account: accountPatch(values as unknown as AccountValues) }
                : section === "basic"
                  ? basicPatch(values as unknown as ElpremarProfileData["basic"])
                  : { posting: values as unknown as ElpremarProfileData["posting"] }
          )
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
          title={loading ? "Loading ELPREMAR…" : "ELPREMAR not found"}
          breadcrumbs={[{ label: "ELPREMARs", to: "/elpremars" }, { label: loading ? "Loading" : "Not found" }]}
        />
        {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
        {loading ? null : (
          <SectionCard title="Nothing here">
            <p className="text-xs text-muted-foreground">
              No ELPREMAR matches that ID.{" "}
              <Link to="/elpremars" className="text-primary hover:underline">Back to ELPREMARs</Link>
            </p>
          </SectionCard>
        )}
      </div>
    )
  }

  const { basic: b, posting: po, work: w, certifications: certs, account } = profile
  const meta = elpremarStatusMeta[profile.status]
  /*
   * Assigned work still comes from the mock book, matched on the person's name:
   * there is no work endpoint, so an ELPREMAR the API knows about has nothing
   * here until there is one. Empty is the honest answer, not a broken one.
   */
  const upcoming = upcomingFor(b.name)

  // Postal code resolves the rest of the location, the way the places API will
  const fillFromPostalCode = (code: string) => {
    const area = areaForPostalCode(code)
    if (!area) return
    basicForm.setValue("district", area.district)
    basicForm.setValue("city", area.city)
    basicForm.setValue("state", area.state)
  }

  // Walks the chosen enterprise's tree, the same way the onboarding step does
  const postedPlants = postedEnterpriseId && tree.data?.id === postedEnterpriseId ? tree.data.plants : []
  const postedPlant = postedPlants.find((pl) => pl.name === postingForm.watch("plant"))
  const postedDepartments = postedPlant?.departments ?? []
  const postedDepartment = postedDepartments.find((d) => d.name === postingForm.watch("department"))
  const postedSubDepartments = postedDepartment?.subDepartments ?? []
  const postedSupervisors = [
    ...(postedDepartment ? [`${postedDepartment.salutation} ${postedDepartment.head}`] : []),
    ...(postedPlant ? [`${postedPlant.salutation} ${postedPlant.head}`] : []),
  ].filter((v, i, a) => a.indexOf(v) === i)
  const clearPosting = (...names: (keyof PostingValues)[]) => names.forEach((n) => postingForm.setValue(n, ""))
  const isSupervisor = workForm.watch("designation") === "Supervisor"
  const roles = workForm.watch("roles") ?? []
  const toggleRole = (role: string) =>
    workForm.setValue("roles", roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role], {
      shouldValidate: true,
    })

  return (
    <div className="space-y-3">
      <PageHeader
        title={`${b.salutation} ${b.name}`}
        breadcrumbs={[{ label: "ELPREMARs", to: "/elpremars" }, { label: b.name }]}
        actions={
          <>
            <Badge variant={meta.badge} className="rounded px-1.5 py-0 text-[0.65rem]">{meta.label}</Badge>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link to="/elpremars"><ArrowLeft className="size-3.5" /> Back to ELPREMARs</Link>
            </Button>
          </>
        }
      />

      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}

      {/* Full onboarding profile, section by section, editable in place */}
      <SectionCard title="ELPREMAR Profile" hoverable={false} contentClassName="space-y-2.5 px-3 pb-3">
        <DetailSection
          icon={UserRound}
          title="Basic Details"
          step={1}
          complete={Boolean(b.name)}
          summary={`${b.employeeId} · ${b.email}`}
          sectionKey="basic"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(basicForm, "basic")}
          saveLabel={saving === "basic" ? "Saving…" : "Save"}
          view={
            <ValueGrid
              rows={[
                { label: "Employee ID", value: b.employeeId },
                { label: "Full Name", value: `${b.salutation} ${b.name}` },
                { label: "Date of Birth", value: showDate(b.dob) },
                { label: "Gender", value: b.gender },
                { label: "Mobile Number", value: [b.phoneCode, b.phone].filter(Boolean).join(" ") },
                { label: "Email", value: b.email },
                { label: "Joined", value: profile.joined },
                { label: "Postal Code", value: b.postalCode },
                { label: "District", value: b.district },
                { label: "City", value: b.city },
                { label: "State", value: b.state },
                { label: "Address", value: [b.addressLine1, b.addressLine2].filter(Boolean).join(", ") },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                <SelectField control={basicForm.control} name="salutation" label="Title" required options={salutations} />
                <TextField control={basicForm.control} name="name" label="Full Name" required />
              </div>
              <TextField control={basicForm.control} name="employeeId" label="Employee / ID Number" required />
              <DateField control={basicForm.control} name="dob" label="Date of Birth" />
              <SelectField control={basicForm.control} name="gender" label="Gender" options={["Male", "Female", "Other"]} />
                            <PhoneField control={basicForm.control} codeName="phoneCode" name="phone" label="Mobile Number" required />
              <TextField control={basicForm.control} name="email" label="Email" required type="email" />
              <TextField control={basicForm.control} name="postalCode" label="Postal Code" maxLength={POSTAL_CODE_MAX_LENGTH} onValueChange={fillFromPostalCode} />
              <TextField control={basicForm.control} name="district" label="District" />
              <TextField control={basicForm.control} name="city" label="City" />
              <TextField control={basicForm.control} name="state" label="State" />
              <TextField control={basicForm.control} name="addressLine1" label="Flat / Building No." />
              <TextField control={basicForm.control} name="addressLine2" label="Street / Area" />
            </form>
          }
        />

        <DetailSection
          icon={HardHat}
          title="Work & Role"
          step={2}
          complete={w.roles.length > 0}
          summary={`${w.designation} · ${w.experience} yrs`}
          sectionKey="work"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(workForm, "work")}
          saveLabel={saving === "work" ? "Saving…" : "Save"}
          view={
            <ValueGrid
              rows={[
                { label: "Designation", value: w.designation },
                { label: "Role", value: w.roles.map(roleStream).join(", ") },
                { label: "Experience", value: `${w.experience} years` },
              ]}
            />
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="space-y-2.5" noValidate>
              <div className="grid gap-2.5 md:grid-cols-3">
                <SelectField control={workForm.control} name="designation" label="Designation" required options={[...elpremarDesignations]} />
                <TextField control={workForm.control} name="experience" label="Experience (Years)" required inputMode="numeric" />
              </div>
              <fieldset>
                <legend className="mb-1.5 text-xs font-medium">
                  Role <span className="text-critical">*</span>
                </legend>
                {/* More than one stream can apply to the same person */}
                <div className="grid gap-1.5 rounded-md bg-muted/40 p-2.5 sm:grid-cols-3">
                  {elpremarRoles.map((r) => (
                    <label key={r} className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggleRole(r)} className="size-3.5" />
                      {roleStream(r)}
                    </label>
                  ))}
                </div>
                {workForm.formState.errors.roles ? (
                  <p className="mt-1 text-xs text-critical">{workForm.formState.errors.roles.message}</p>
                ) : null}
              </fieldset>
            </form>
          }
        />

        <DetailSection
          icon={Building2}
          title="Assigned Enterprise"
          step={3}
          complete={Boolean(po.enterprise)}
          optional
          summary={po.enterprise ? `${po.enterprise} · ${po.plant}` : "Not assigned"}
          sectionKey="posting"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(postingForm, "posting")}
          saveLabel={saving === "posting" ? "Saving…" : "Save"}
          view={
            po.enterprise ? (
              <ValueGrid
                rows={[
                  { label: "Enterprise", value: po.enterprise },
                  { label: "Plant", value: po.plant },
                  { label: "Department", value: po.department },
                  { label: "Sub-Department", value: po.subDepartment },
                  { label: "Reporting Supervisor", value: po.supervisor },
                  { label: "Effective From", value: po.effectiveFrom },
                  { label: "City", value: po.city },
                  { label: "Country", value: po.country },
                ]}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Not assigned to an enterprise yet.
              </p>
            )
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-3" noValidate>
              {/* Each list is read from the chosen enterprise, so a posting always exists */}
              {register.error ? (
                <ErrorNotice error={register.error} onRetry={register.reload} className="md:col-span-3" />
              ) : null}
              {tree.error ? (
                <ErrorNotice error={tree.error} onRetry={tree.reload} className="md:col-span-3" />
              ) : null}
              <SelectField
                control={postingForm.control}
                name="enterprise"
                label="Enterprise"
                disabled={register.loading && enterprises.length === 0}
                options={enterprises.map((e) => e.name)}
                placeholder={register.loading && enterprises.length === 0 ? "Loading enterprises…" : "Unassigned"}
                onValueChange={() => clearPosting("plant", "department", "subDepartment", "supervisor")}
              />
              <SelectField
                control={postingForm.control}
                name="plant"
                label="Plant"
                disabled={!postedEnterprise || tree.loading}
                placeholder={
                  !postedEnterprise ? "Select an enterprise first" : tree.loading ? "Loading plants…" : "Select"
                }
                options={postedPlants.map((pl) => pl.name)}
                onValueChange={() => clearPosting("department", "subDepartment", "supervisor")}
              />
              <SelectField
                control={postingForm.control}
                name="department"
                label="Department"
                disabled={!postedPlant}
                placeholder={postedPlant ? "Select" : "Select a plant first"}
                options={postedDepartments.map((d) => d.name)}
                onValueChange={() => clearPosting("subDepartment", "supervisor")}
              />
              <SelectField
                control={postingForm.control}
                name="subDepartment"
                label="Sub-Department"
                disabled={!postedDepartment}
                placeholder={postedDepartment ? "Select" : "Select a department first"}
                options={postedSubDepartments.map((s) => s.name)}
              />
              {/* A supervisor has nobody above them to report to */}
              <SelectField
                control={postingForm.control}
                name="supervisor"
                label="Reporting Supervisor"
                disabled={isSupervisor || !postedDepartment}
                placeholder={
                  isSupervisor ? "Not applicable for a supervisor" : postedDepartment ? "Select" : "Select a department first"
                }
                options={postedSupervisors}
              />
              <TextField control={postingForm.control} name="effectiveFrom" label="Effective From" />
              <TextField control={postingForm.control} name="city" label="City" required />
              <SelectField control={postingForm.control} name="country" label="Country" required options={countries} />
            </form>
          }
        />

        <DetailSection
          icon={Award}
          title={`Certifications (${certs.length})`}
          step={4}
          complete={certs.length > 0}
          summary={certs.map((c) => c.name).join(", ")}
          sectionKey="certs"
          editing={editing}
          onEditingChange={setEditing}
          view={
            certs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No certifications recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className={th}>#</TableHead>
                      <TableHead className={th}>Certificate</TableHead>
                      <TableHead className={th}>Certificate No.</TableHead>
                      <TableHead className={th}>Issuing Organisation</TableHead>
                      <TableHead className={`${th} hidden sm:table-cell`}>Issued</TableHead>
                      <TableHead className={th}>Valid Till</TableHead>
                      <TableHead className={th}>Documents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certs.map((c, i) => (
                      <TableRow key={c.id}>
                        <TableCell className={`${td} tabular-nums text-muted-foreground`}>{i + 1}</TableCell>
                        <TableCell className={`${td} font-medium`}>{c.name}</TableCell>
                        <TableCell className={`${td} tabular-nums`}>{c.number}</TableCell>
                        <TableCell className={td}>{c.issuer}</TableCell>
                        <TableCell className={`${td} hidden tabular-nums sm:table-cell`}>{c.issued}</TableCell>
                        <TableCell className={td}>
                          <ExpiryValue validTill={c.validTill} />
                        </TableCell>
                        <TableCell className={`${td} text-muted-foreground`}>
                          {c.documents} file{c.documents > 1 ? "s" : ""}
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
          icon={ShieldCheck}
          title="Account & Access"
          step={5}
          complete={Boolean(account.email)}
          summary={account.email}
          sectionKey="account"
          editing={editing}
          onEditingChange={setEditing}
          onSave={save(accountForm, "account")}
          saveLabel={saving === "account" ? "Saving…" : "Save"}
          view={
            <ValueGrid
              rows={[
                { label: "Login Email", value: account.email },
                { label: "User Role", value: account.role },
                { label: "Web Access", value: account.webAccess ? "Allowed" : "Not allowed" },
                { label: "Mobile Access", value: account.mobileAccess ? "Allowed" : "Not allowed" },
                { label: "Last Login", value: account.lastLogin },
              ]}
            />
          }
          /*
           * Outside the edit form on purpose: setting someone's password is not
           * a profile field and must not ride along with a Save of the section.
           * It is also the only recovery once Cognito's invitation window
           * lapses - the engineer's own route is EVITA's Forgot Password.
           */
          action={
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setResettingPassword(true)}
            >
              <KeyRound className="size-3.5" /> Reset Password
            </Button>
          }
          edit={
            <form onSubmit={(ev) => ev.preventDefault()} className="grid gap-2.5 md:grid-cols-2" noValidate>
              <TextField control={accountForm.control} name="email" label="Login Email" required type="email" />
              <SelectField control={accountForm.control} name="role" label="User Role" required options={userRoles} />
              <div className="md:col-span-2 flex flex-wrap gap-4 rounded-md bg-muted/40 p-2.5 text-xs">
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={accountForm.watch("webAccess")}
                    onCheckedChange={(v) => accountForm.setValue("webAccess", v === true)}
                    className="size-3.5"
                  />
                  Allow web access
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={accountForm.watch("mobileAccess")}
                    onCheckedChange={(v) => accountForm.setValue("mobileAccess", v === true)}
                    className="size-3.5"
                  />
                  Allow mobile (EVITA tablet) access
                </label>
              </div>
            </form>
          }
        />
      </SectionCard>

      <SectionCard title="Upcoming Activities" hoverable={false}>
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nothing scheduled.
          </p>
        ) : (
          <ol className="divide-y">
            {upcoming.map((u) => {
              const kind = ACTIVITY_KINDS[u.kind]
              return (
                <li key={u.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", kind.tone)}>
                    <kind.icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{u.label}</div>
                    <div className="truncate text-[0.65rem] text-muted-foreground">{u.kind} · {u.plant}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs font-medium">{whenLabel(u.date)}</div>
                    <div className="text-[0.65rem] tabular-nums text-muted-foreground">
                      {u.slot == null ? u.date : slotLabel(u.slot)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </SectionCard>

      {/* Keyed so each open starts from an empty form */}
      <ChangePasswordDialog
        key={resettingPassword ? "open" : "closed"}
        open={resettingPassword}
        onOpenChange={setResettingPassword}
        userName={profile.basic.name}
        description={`Sets a new password for ${profile.basic.name}. They sign in to EVITA with it and are asked to replace it straight away. Tell them directly - this is not emailed.`}
        onSave={async (newPassword) => {
          try {
            await updateElpremar(id, { account: { password: newPassword } })
            toast.success("Password reset", {
              description: `${profile.basic.name} must change it at next sign-in`,
            })
          } catch (e) {
            toast.error("Could not reset the password", { description: messageFor(e), duration: 10_000 })
            throw e
          }
        }}
      />
    </div>
  )
}
