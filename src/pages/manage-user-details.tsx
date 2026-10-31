import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Check, Lock, LockOpen, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { ChangePasswordDialog } from "@/components/common/change-password-dialog"
import { Detail } from "@/components/common/detail-view"
import { PhoneField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  consoleUserRoles,
  consoleUserStatuses,
  consoleUserStatusTone,
  emailTaken,
  findConsoleUser,
  resetConsoleUserPassword,
  updateConsoleUser,
  useConsoleUsers,
  type ConsoleUserRole,
  type ConsoleUserStatus,
} from "@/data/console-users"
import { countries } from "@/data/mock"
import { dialCodes } from "@/data/master-data"
import { control } from "@/lib/data-table"
import { required } from "@/lib/validation"

/** Role pills — identity, not status, so neutral tints rather than health colours */
const roleTone: Record<ConsoleUserRole, string> = {
  "OCC Admin": "bg-info-soft text-info-soft-foreground",
  "OCC Manager": "bg-highlight-soft text-highlight-soft-foreground",
  "OCC Technician": "bg-neutral-soft text-neutral-soft-foreground",
  "EMMSE-0": "bg-attention-soft text-attention-soft-foreground",
}

const MOBILE_DIGITS = 10

const schema = z.object({
  name: required("Name"),
  role: required("Role"),
  email: z.email("Enter a valid email address"),
  phoneCode: z.string().optional(),
  phone: z.string().regex(/^\d{10}$/, "Enter a 10-digit phone number"),
  country: required("Country"),
  address: required("Address"),
  status: required("Status"),
})
type FormValues = z.infer<typeof schema>

/*
 * The register stores one phone string ("+91 9820011223") because that is what
 * the table renders. The form needs the halves apart, so split on the longest
 * dialling code that matches — "+971" has to win over "+9".
 */
const codesByLength = [...dialCodes].sort((a, b) => b.code.length - a.code.length)

function splitPhone(value: string) {
  const trimmed = (value ?? "").trim()
  const match = codesByLength.find((d) => trimmed.startsWith(d.code))
  const local = match ? trimmed.slice(match.code.length) : trimmed
  return { phoneCode: match?.code ?? "+91", phone: local.replace(/\D/g, "").slice(0, MOBILE_DIGITS) }
}

const joinPhone = (code: string | undefined, local: string) => [code?.trim(), local.trim()].filter(Boolean).join(" ")

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

/** A console user's record, read-only until the admin chooses to edit it. */
export function ManageUserDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // Subscribing keeps the screen live if the register changes underneath it
  useConsoleUsers()
  const user = findConsoleUser(id)
  const [editing, setEditing] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  // Reveal is per visit and never sticky - it closes again on any navigation
  const [revealPassword, setRevealPassword] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      role: user?.role ?? "",
      email: user?.email ?? "",
      country: user?.country ?? countries[0],
      address: user?.address ?? "",
      status: user?.status ?? "Active",
      ...splitPhone(user?.phone ?? ""),
    },
  })
  const { reset } = form

  // Navigating between users while this page is mounted must not keep the old values
  useEffect(() => {
    if (!user) return
    reset({
      name: user.name,
      role: user.role,
      email: user.email,
      country: user.country,
      address: user.address,
      status: user.status,
      ...splitPhone(user.phone),
    })
  }, [user, reset])

  if (!user) {
    return (
      <div>
        <PageHeader title="User not found" breadcrumbs={[{ label: "Manage Users", to: "/manage-users" }, { label: "Not found" }]} />
        <SectionCard title="User not found" hoverable={false}>
          <p className="text-xs text-muted-foreground">
            No user with that id is on the register.{" "}
            <Link to="/manage-users" className="text-primary hover:underline">Back to Manage Users</Link>
          </p>
        </SectionCard>
      </div>
    )
  }

  const save = form.handleSubmit((values) => {
    // One login per address, and the row must not collide with itself
    if (emailTaken(values.email, user.id)) {
      form.setError("email", { message: "Another user already has this e-mail" })
      return
    }

    updateConsoleUser(user.id, {
      name: values.name.trim(),
      role: values.role as ConsoleUserRole,
      email: values.email.trim(),
      phone: joinPhone(values.phoneCode, values.phone),
      country: values.country,
      address: values.address.trim(),
      status: values.status as ConsoleUserStatus,
    })
    setEditing(false)
    toast.success("User updated", { description: `${values.name.trim()} · ${user.id}` })
  })

  const cancel = () => {
    reset({
      name: user.name,
      role: user.role,
      email: user.email,
      country: user.country,
      address: user.address,
      status: user.status,
      ...splitPhone(user.phone),
    })
    setEditing(false)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={user.name}
        breadcrumbs={[{ label: "Manage Users", to: "/manage-users" }, { label: user.id }]}
        actions={
          <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => navigate("/manage-users")}>
            <ArrowLeft className="size-3.5" /> Back to list
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        {/* ---------- Who they are ---------- */}
        <SectionCard title="User" icon={<UserRound className="size-4 text-primary" />} hoverable={false}>
          <div className="flex flex-col items-center gap-3 py-1 text-center">
            <Avatar className="size-20 ring-2 ring-background shadow-sm outline outline-foreground/10">
              <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{user.name}</p>
              <span className={cn("mt-1 inline-block rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", roleTone[user.role])}>
                {user.role}
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-2.5 border-t pt-3">
            <Detail label="User ID"><span className="tabular-nums">{user.id}</span></Detail>
            <Detail label="Added By">{user.addedBy}</Detail>
            <Detail label="Added On"><span className="tabular-nums">{user.addedOn}</span></Detail>
            <Detail label="Password">
              <span className="flex items-center gap-1.5">
                {/* The lock is the reveal control: shut when hidden, open when shown */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={!user.tempPassword}
                  aria-pressed={revealPassword}
                  aria-label={revealPassword ? "Hide password" : "Show password"}
                  title={user.tempPassword ? (revealPassword ? "Hide password" : "Show password") : "Set by the user — not visible"}
                  className="size-6 shrink-0 text-muted-foreground"
                  onClick={() => setRevealPassword((v) => !v)}
                >
                  {revealPassword ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
                </Button>

                {user.tempPassword && revealPassword ? (
                  <span className="min-w-0 truncate font-mono text-xs" title={user.tempPassword}>{user.tempPassword}</span>
                ) : (
                  <span className="tracking-[0.2em] select-none" aria-hidden>••••••••</span>
                )}

                {editing ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Change password"
                    title="Change password"
                    className="ml-auto size-6 shrink-0 text-muted-foreground"
                    onClick={() => setChangingPassword(true)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                ) : null}
              </span>
              <span className="mt-1 block text-[0.65rem] text-muted-foreground">
                {!user.tempPassword
                  ? "Set by the user — not visible"
                  : user.mustChangePassword
                    ? "Temporary — reset on first sign-in"
                    : "Temporary password issued"}
              </span>
            </Detail>
          </div>
        </SectionCard>

        {/* ---------- Their details, editable in place ---------- */}
        <SectionCard
          title="User Details"
          icon={<ShieldCheck className="size-4 text-primary" />}
          hoverable={false}
          actions={
            editing ? (
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={cancel}>
                  <X className="size-3.5" /> Cancel
                </Button>
                <Button size="sm" className={control} onClick={save}>
                  <Check className="size-3.5" /> Save Changes
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            )
          }
        >
          {editing ? (
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
              <TextField control={form.control} name="name" label="Name" required startIcon={<UserRound />} />
              <SelectField control={form.control} name="role" label="Role" required options={[...consoleUserRoles]} />
              <TextField control={form.control} name="email" label="Email ID" required type="email" autoComplete="email" startIcon={<Mail />} className="sm:col-span-2" />
              <PhoneField control={form.control} codeName="phoneCode" name="phone" label="Phone Number" required digits={MOBILE_DIGITS} />
              <SelectField control={form.control} name="country" label="Country" required options={countries} />
              <SelectField control={form.control} name="status" label="Status" required options={[...consoleUserStatuses]} />
              <TextareaField control={form.control} name="address" label="Address" required rows={2} className="sm:col-span-2" />
            </form>
          ) : (
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Name">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <UserRound className="size-3.5 text-muted-foreground" />
                  {user.name}
                </span>
              </Detail>
              <Detail label="Role">
                <span className={cn("inline-block rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", roleTone[user.role])}>
                  {user.role}
                </span>
              </Detail>
              <Detail label="Email ID" className="sm:col-span-2">
                <span className="flex flex-wrap items-center gap-1.5 text-sm">
                  <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 break-all">{user.email}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground">Sign-in ID</span>
                </span>
              </Detail>
              <Detail label="Phone Number">
                <span className="flex items-center gap-1.5 text-sm tabular-nums">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {user.phone}
                </span>
              </Detail>
              <Detail label="Country">
                <span className="flex items-center gap-1.5 text-sm">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {user.country}
                </span>
              </Detail>
              <Detail label="Status">
                <span className={cn("inline-block rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", consoleUserStatusTone[user.status])}>
                  {user.status}
                </span>
              </Detail>
              <Detail label="Address" className="sm:col-span-2">
                <span className="text-sm">{user.address}</span>
              </Detail>
            </dl>
          )}
        </SectionCard>
      </div>

      {/* Keyed so each open starts from an empty form */}
      <ChangePasswordDialog
        key={changingPassword ? "open" : "closed"}
        open={changingPassword}
        onOpenChange={setChangingPassword}
        userName={user.name}
        // Still the in-memory console-user register: this screen reads its record
        // from there too, so there is nothing to POST to yet.
        // TODO: POST /console-users/:id/password once the register is API-backed
        onSave={(newPassword) => {
          resetConsoleUserPassword(user.id, newPassword)
          toast.success("Password changed", { description: `${user.name} will be asked to reset it at next sign-in` })
        }}
      />
    </div>
  )
}
