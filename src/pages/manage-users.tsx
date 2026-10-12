import { useMemo, useState } from "react"
import { useNavigate } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FileText, Plus, Search, Sheet, UserPlus, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "cn"

import { SortHead, TablePager } from "@/components/common/data-table"
import { PageHeader } from "@/components/common/page-header"
import { PasswordField, PhoneField, SelectField, TextareaField, TextField } from "@/components/form/fields"
import { PasswordStrength } from "@/components/form/password-requirements"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { addConsoleUser, consoleUserRoles, consoleUserStatuses, consoleUserStatusTone, emailTaken, useConsoleUsers, type ConsoleUser, type ConsoleUserRole, type ConsoleUserStatus } from "@/data/console-users"
import { countries } from "@/data/mock"
import { useAuth } from "@/lib/auth/context"
import { control, nextSort, sortRows, td, th, type Sort } from "@/lib/data-table"
import { exportCsv, exportPdf, type ExportColumn } from "@/lib/table-export"
import { password, required } from "@/lib/validation"

/** Role pills — identity, not status, so these are neutral tints rather than health colours */
const roleTone: Record<ConsoleUserRole, string> = {
  "OCC Admin": "bg-info-soft text-info-soft-foreground",
  "OCC Manager": "bg-highlight-soft text-highlight-soft-foreground",
  "OCC Technician": "bg-neutral-soft text-neutral-soft-foreground",
  "EMMSE-0": "bg-attention-soft text-attention-soft-foreground",
}

type SortKey = "name" | "role" | "email" | "phone" | "country" | "address" | "status"

const sortValue: Record<SortKey, (u: ConsoleUser) => string> = {
  name: (u) => u.name,
  role: (u) => u.role,
  email: (u) => u.email,
  phone: (u) => u.phone,
  country: (u) => u.country,
  address: (u) => u.address,
  status: (u) => u.status,
}

const exportColumns: ExportColumn<ConsoleUser>[] = [
  { header: "User ID", value: (u) => u.id },
  { header: "Name", value: (u) => u.name },
  { header: "Role", value: (u) => u.role },
  { header: "Email ID", value: (u) => u.email },
  { header: "Phone Number", value: (u) => u.phone },
  { header: "Country", value: (u) => u.country },
  { header: "Address", value: (u) => u.address },
  { header: "Status", value: (u) => u.status },
]

/* ---------- Add User ---------- */

const MOBILE_DIGITS = 10

const schema = z
  .object({
    name: required("Name"),
    role: required("Role"),
    email: z.email("Enter a valid email address"),
    phoneCode: z.string().optional(),
    // Ten digits exactly, matching the profile screen; the code is held separately
    phone: z.string().regex(/^\d{10}$/, "Enter a 10-digit phone number"),
    country: required("Country"),
    address: required("Address"),
    // A new login is usable straight away unless the admin says otherwise
    status: required("Status"),
    // The temporary one the admin hands over; the user is made to replace it on first sign-in
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })
type FormValues = z.infer<typeof schema>

function AddUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", role: "", email: "", phoneCode: "+91", phone: "", country: countries[0], address: "", status: "Active", password: "", confirmPassword: "" },
  })

  const pwd = form.watch("password")

  const submit = form.handleSubmit((values) => {
    // One login per address, so a duplicate is a field error rather than a second row
    if (emailTaken(values.email)) {
      form.setError("email", { message: "A user with this e-mail already exists" })
      return
    }

    const added = addConsoleUser(
      {
        name: values.name.trim(),
        role: values.role as ConsoleUserRole,
        email: values.email.trim(),
        phone: [values.phoneCode?.trim(), values.phone].filter(Boolean).join(" "),
        country: values.country,
        address: values.address.trim(),
        status: values.status as ConsoleUserStatus,
        // Kept so the admin can read it back - see the note on ConsoleUser.tempPassword
        tempPassword: values.password,
        // TODO: POST /console-users with values.password over TLS. The password is
        // deliberately not kept client-side - only the flag that forces a reset is.
        mustChangePassword: true,
      },
      user?.name ?? "OCC Admin"
    )

    toast.success(`${added.name} added`, { description: `${added.role} · ${added.id}` })
    onOpenChange(false)
  })

  return (
    // Remounting on open clears whatever the last attempt left behind
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-base">
            <UserPlus className="size-4 text-primary" /> Add User
          </DialogTitle>
          <DialogDescription>
            Creates a console login. The user signs in with this e-mail address.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <TextField control={form.control} name="name" label="Name" required />
          <SelectField control={form.control} name="role" label="Role" required options={[...consoleUserRoles]} />
          <TextField control={form.control} name="email" label="Email ID" required type="email" autoComplete="email" className="sm:col-span-2" />
          <SelectField control={form.control} name="country" label="Country" required options={countries} />
          <PhoneField control={form.control} codeName="phoneCode" name="phone" label="Phone Number" required digits={MOBILE_DIGITS} />
          <TextareaField control={form.control} name="address" label="Address" required rows={2} className="sm:col-span-2" />
          <SelectField control={form.control} name="status" label="Status" required options={[...consoleUserStatuses]} />
          <div className="hidden sm:block" aria-hidden />

          <div className="space-y-2 sm:col-span-2">
            <PasswordField control={form.control} name="password" label="Password" required />
            <PasswordStrength value={pwd} />
          </div>
          <PasswordField control={form.control} name="confirmPassword" label="Confirm Password" required className="sm:col-span-2" />
        </form>

        <DialogFooter>
          <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className={control} onClick={submit}>
            <Plus className="size-3.5" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Page ---------- */

/** Manage Users: the console logins an OCC Admin has provisioned. */
export function ManageUsersPage() {
  const navigate = useNavigate()
  const rows = useConsoleUsers()
  const [query, setQuery] = useState("")
  const [role, setRole] = useState("all")
  const [sort, setSort] = useState<Sort<SortKey>>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [adding, setAdding] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((u) => {
      if (role !== "all" && u.role !== role) return false
      if (!q) return true
      return [u.id, u.name, u.role, u.email, u.phone, u.country, u.address, u.status].some((v) => v.toLowerCase().includes(q))
    })
  }, [rows, query, role])

  const sorted = useMemo(() => sortRows(filtered, sort, sortValue), [filtered, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize))
  // Narrowing the results can strand the viewer past the last page, so clamp on read
  const current = Math.min(page, pages)
  const start = (current - 1) * pageSize
  const shown = sorted.slice(start, start + pageSize)

  const filtersOn = !!query || role !== "all"
  const clearFilters = () => {
    setQuery("")
    setRole("all")
  }

  return (
    <div>
      <PageHeader
        title="Manage Users"
        description=""
        breadcrumbs={[{ label: "Manage Users" }]}
        actions={
          <>
            <Button size="sm" className={control} onClick={() => setAdding(true)}>
              <Plus className="size-3.5" /> Add User
            </Button>
            <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => exportCsv("console-users", exportColumns, sorted)}>
              <Sheet className="size-3.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" className={cn(control, "bg-card")} onClick={() => exportPdf("Console Users", exportColumns, sorted)}>
              <FileText className="size-3.5" /> Export PDF
            </Button>
          </>
        }
      />

      <section className="flex flex-col rounded-lg bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10">
        {/* Search hard left, filters centred, clear hard right - as on the activity lists */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
          <div className="relative">
            <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder="Search here..."
              className={cn(control, "w-60 bg-card pl-7")}
            />
          </div>
          <div className="mx-auto flex flex-wrap items-center gap-2">
            <Select value={role} onValueChange={(v) => { setRole(v); setPage(1) }}>
              <SelectTrigger size="sm" aria-label="Role" className={cn(control, "w-44 bg-card")}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {consoleUserRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" className={cn(control, "bg-card")} disabled={!filtersOn} onClick={clearFilters}>
            <X className="size-3.5" /> Clear Filters
          </Button>
        </div>

        <div className="overflow-x-auto px-2 pb-3">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className={cn(th, "w-10")}>#</TableHead>
                <SortHead label="Name" column="name" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Role" column="role" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Email ID" column="email" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Phone Number" column="phone" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Country" column="country" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Address" column="address" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
                <SortHead label="Status" column="status" sort={sort} onSort={(c) => setSort(nextSort(sort, c))} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((u, i) => (
                <TableRow key={u.id} onClick={() => navigate(`/manage-users/${u.id}`)} className="cursor-pointer">
                  <TableCell className={cn(td, "tabular-nums text-muted-foreground")}>{start + i + 1}</TableCell>
                  <TableCell className={cn(td, "font-medium whitespace-nowrap")}>
                    {u.name}
                    <span className="block text-[0.65rem] font-normal text-muted-foreground tabular-nums">{u.id}</span>
                  </TableCell>
                  <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold whitespace-nowrap", roleTone[u.role])}>{u.role}</span>
                  </TableCell>
                  <TableCell className={cn(td, "whitespace-nowrap")}>{u.email}</TableCell>
                  <TableCell className={cn(td, "tabular-nums whitespace-nowrap")}>{u.phone}</TableCell>
                  <TableCell className={cn(td, "whitespace-nowrap")}>{u.country}</TableCell>
                  <TableCell className={cn(td, "max-w-72 whitespace-normal text-muted-foreground")}>{u.address}</TableCell>
                  <TableCell className={td}>
                    <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", consoleUserStatusTone[u.status])}>{u.status}</span>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    No users match the filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <TablePager
            page={current}
            pages={pages}
            pageSize={pageSize}
            total={sorted.length}
            start={start}
            onPage={setPage}
            onPageSize={(n) => { setPageSize(n); setPage(1) }}
          />
        </div>
      </section>

      {/* Keyed so each open starts from a blank form */}
      <AddUserDialog key={adding ? "open" : "closed"} open={adding} onOpenChange={setAdding} />
    </div>
  )
}
