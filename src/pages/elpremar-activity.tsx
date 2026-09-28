import { useMemo, useState } from "react"
import { Link } from "react-router"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  HardHat,
  Mail,
  Paperclip,
  Phone,
  Send,
  UserPlus,
  UserRound,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { SelectField, TextareaField, TextField } from "@/components/form/fields"
import {
  activityTypes,
  areas,
  assetCategories,
  durations,
  elpremarKpis,
  elpremars,
  enterprises,
  plants,
  priorities,
  recentAssignedTasks,
  todaysTasks,
  type AssignedTask,
} from "@/data/mock"
import { workStatus } from "@/lib/status"
import { required } from "@/lib/validation"

const schema = z.object({
  elpremar: required("ELPREMAR"),
  enterprise: required("Enterprise"),
  plant: required("Plant"),
  area: required("Location / Area"),
  category: required("Asset category"),
  activity: required("Activity type"),
  date: required("Scheduled date"),
  time: required("Start time"),
  duration: z.string().optional(),
  description: required("Task description"),
  priority: required("Priority"),
})
type AssignValues = z.infer<typeof schema>

const elpremarOptions = elpremars.map((e) => `${e.name} (${e.id})`)

const priorityBadge: Record<string, "neutral" | "warning" | "critical"> = {
  Low: "neutral",
  Medium: "warning",
  High: "critical",
  Critical: "critical",
}

/* Mock availability for the calendar: day-of-month → state */
const availability: Record<number, "assigned" | "completed" | "leave" | "unavailable"> = {
  1: "completed", 2: "assigned", 7: "completed", 8: "assigned", 9: "completed", 10: "assigned",
  14: "completed", 16: "assigned", 20: "completed", 21: "assigned", 23: "completed",
  24: "assigned", 26: "leave", 28: "completed", 30: "assigned", 31: "unavailable",
}
const availabilityStyle = {
  assigned: { dot: "bg-healthy", label: "Assigned" },
  completed: { dot: "bg-info", label: "Completed" },
  leave: { dot: "bg-attention", label: "On Leave" },
  unavailable: { dot: "bg-critical", label: "Not Available" },
}

function AvailabilityCalendar() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const today = new Date()
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) })

  return (
    <div>
      <div className="mb-2 flex items-center justify-between rounded-md bg-info-soft px-2 py-1">
        <Button variant="ghost" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="Previous month"><ChevronLeft /></Button>
        <span className="text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month"><ChevronRight /></Button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1 font-medium text-muted-foreground">{d}</div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const state = inMonth ? availability[day.getDate()] : undefined
          const isToday = isSameDay(day, today)
          return (
            <div key={day.toISOString()} className="flex flex-col items-center py-0.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md",
                  !inMonth && "text-muted-foreground/50",
                  isToday && "bg-primary font-semibold text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              <span className={cn("mt-0.5 size-1.5 rounded-full", state ? availabilityStyle[state].dot : "bg-transparent")} />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
        {Object.values(availabilityStyle).map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", s.dot)} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, tone, label, value, link }: { icon: typeof UserRound; tone: string; label: string; value: number; link?: string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
      <div className={cn("flex size-12 items-center justify-center rounded-xl", tone)}>
        <Icon className="size-6" />
      </div>
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
      {link ? (
        <Link to={link} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          View All <ArrowRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  )
}

/** ELPREMAR Activity & Availability (mockup page 13) */
export function ElpremarActivityPage() {
  const [tasks, setTasks] = useState<AssignedTask[]>(recentAssignedTasks)
  const form = useForm<AssignValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      elpremar: elpremarOptions[0], enterprise: enterprises[0], plant: plants[0], area: "", category: "", activity: "",
      date: "", time: "", duration: "4 Hours", description: "", priority: "Medium",
    },
  })
  const { control, watch } = form
  const selectedLabel = watch("elpremar")
  const selected = useMemo(() => elpremars.find((e) => selectedLabel?.includes(e.id)) ?? elpremars[0], [selectedLabel])

  const assign = form.handleSubmit((v) => {
    // TODO: POST /tasks
    setTasks((t) => [
      {
        date: v.date.split("-").reverse().join("-"),
        elpremar: selected.name,
        enterprise: v.enterprise,
        location: v.area,
        activity: v.activity,
        priority: v.priority as AssignedTask["priority"],
        status: "assigned",
      },
      ...t,
    ])
    toast.success(`Task assigned to ${selected.name}`)
    form.reset()
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="ELPREMAR Activity & Availability"
        description="Assign and manage electrical asset assessment and maintenance activities for ELPREMAR."
        breadcrumbs={[{ label: "ELPREMAR Activity & Availability" }]}
        actions={
          <>
            <Button variant="outline" className="bg-card"><BookOpen /> View User Guide</Button>
            <Button asChild><Link to="/elpremars/onboard"><UserPlus /> Onboard ELPREMAR</Link></Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={HardHat} tone="bg-info-soft text-primary" label="Total ELPREMAR" value={elpremarKpis.total} link="/elpremars" />
        <KpiCard icon={UserRoundCheck} tone="bg-healthy text-healthy-foreground" label="On Duty" value={elpremarKpis.onDuty} />
        <KpiCard icon={Clock} tone="bg-attention text-attention-foreground" label="On Leave" value={elpremarKpis.onLeave} />
        <KpiCard icon={UserRoundX} tone="bg-critical text-critical-foreground" label="Not Assigned" value={elpremarKpis.notAssigned} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
        <SectionCard title={<span className="text-lg">Assign Activity to ELPREMAR</span>}>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">Create and assign a new task for electrical asset assessment at the selected location.</p>
          <form onSubmit={assign} className="grid gap-4 md:grid-cols-6" noValidate>
            <SelectField control={control} name="elpremar" label="Select ELPREMAR" required options={elpremarOptions} className="md:col-span-3" />
            <div className="flex items-center gap-3 self-end rounded-lg bg-info-soft p-2 md:col-span-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-card text-primary"><UserRound className="size-5" /></div>
              <div className="text-xs">
                <div className="text-sm font-semibold text-primary">{selected.name}</div>
                <div>{selected.id}</div>
                <div className="text-muted-foreground">{selected.department} Dept. | {selected.plant}</div>
              </div>
            </div>
            <SelectField control={control} name="enterprise" label="Enterprise" required options={enterprises} className="md:col-span-3" />
            <SelectField control={control} name="plant" label="Plant" required options={plants} className="md:col-span-3" />
            <SelectField control={control} name="area" label="Location / Area" required options={areas} className="md:col-span-2" />
            <SelectField control={control} name="category" label="Asset Category" required options={assetCategories} className="md:col-span-2" />
            <SelectField control={control} name="activity" label="Activity Type" required options={activityTypes} className="md:col-span-2" />
            <TextField control={control} name="date" label="Scheduled Date" required type="date" className="md:col-span-2" />
            <TextField control={control} name="time" label="Start Time" required type="time" className="md:col-span-2" />
            <SelectField control={control} name="duration" label="Estimated Duration" options={durations} className="md:col-span-2" />
            <TextareaField control={control} name="description" label="Task Description" required rows={2} className="md:col-span-6" />
            <SelectField control={control} name="priority" label="Priority" required options={priorities} className="md:col-span-2" />
            <div className="md:col-span-4">
              <div className="mb-2 text-sm font-medium">Attachments <span className="font-normal text-muted-foreground">(Optional)</span></div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-info-soft px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                <Paperclip className="size-4" /> Upload Files
                <input type="file" multiple accept=".pdf,image/png,image/jpeg" className="sr-only" />
              </label>
              <span className="ml-3 text-xs text-muted-foreground">PDF, JPG, PNG (Max 5 MB)</span>
            </div>
            <div className="flex justify-between gap-3 md:col-span-6">
              <Button type="button" variant="outline" size="lg" className="min-w-24" onClick={() => form.reset()}>Clear</Button>
              <Button type="submit" size="lg" className="min-w-36"><Send /> Assign Task</Button>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="ELPREMAR Availability" actions={<Button variant="link" size="xs"><CalendarDays /> View Calendar</Button>}>
            <AvailabilityCalendar />
          </SectionCard>

          <SectionCard title="Selected ELPREMAR Details" actions={<Button variant="link" size="xs">View Profile</Button>}>
            <div className="flex items-start gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-attention-soft text-attention"><HardHat className="size-7" /></div>
              <div className="min-w-0 flex-1 text-xs">
                <div className="text-sm font-semibold">{selected.name}</div>
                <div>{selected.id}</div>
                <div className="text-muted-foreground">{selected.department} Department</div>
                <div className="text-muted-foreground">{selected.plant}</div>
              </div>
              <div className="space-y-1.5 text-xs">
                <Badge variant={selected.available ? "healthy" : "critical"}>{selected.available ? "Available" : "Not Available"}</Badge>
                <div className="flex items-center gap-1.5"><Phone className="size-3.5 text-primary" /> {selected.phone}</div>
                <div className="flex items-center gap-1.5"><Mail className="size-3.5 text-primary" /> <span className="truncate">{selected.email}</span></div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={`Today's Tasks (${format(new Date(), "d MMM yyyy")})`} viewAllTo="/elpremars" contentClassName="px-2">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>#</TableHead><TableHead>Time</TableHead><TableHead>Location / Asset</TableHead><TableHead>Activity</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaysTasks.map((t, i) => (
                  <TableRow key={t.time}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{t.time}</TableCell>
                    <TableCell>{t.asset}</TableCell>
                    <TableCell>{t.activity}</TableCell>
                    <TableCell><Badge variant={workStatus[t.status].badge}>{workStatus[t.status].label}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Recent Assigned Tasks" viewAllTo="/elpremars" contentClassName="px-2">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>ELPREMAR</TableHead><TableHead>Enterprise</TableHead>
              <TableHead>Location / Asset</TableHead><TableHead>Activity</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((t, i) => (
              <TableRow key={`${t.date}-${t.location}-${i}`}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{t.date}</TableCell>
                <TableCell>{t.elpremar}</TableCell>
                <TableCell>{t.enterprise}</TableCell>
                <TableCell>{t.location}</TableCell>
                <TableCell>{t.activity}</TableCell>
                <TableCell><Badge variant={priorityBadge[t.priority]}>{t.priority}</Badge></TableCell>
                <TableCell><Badge variant={workStatus[t.status].badge}>{workStatus[t.status].label}</Badge></TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon-sm" className="text-primary" aria-label="View task"><Eye /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  )
}
