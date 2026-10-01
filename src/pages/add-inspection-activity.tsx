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
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Mail,
  Paperclip,
  Phone,
  Send,
  UserRound,
} from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AssignElpremarDialog, type AssignResult, type Booking,
} from "@/components/common/assign-elpremar-dialog"
import { PageHeader } from "@/components/common/page-header"
import { SectionCard } from "@/components/common/section-card"
import { SelectField, TextareaField, TextField } from "@/components/form/fields"
import {
  activityTypes,
  areas,
  assetCategories,
  durations,
  enterprises,
  plants,
  priorities,
  todaysTasks,
  type Elpremar,
} from "@/data/mock"
import { inspectionActivities, maintenanceActivities, slotLabel } from "@/data/occ-tables"
import { control as controlSize, td, th } from "@/lib/data-table"
import { workStatus } from "@/lib/status"
import { required } from "@/lib/validation"

const schema = z.object({
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

/*
 * Mock availability: the days this ELPREMAR cannot take work (leave or otherwise
 * unavailable). Every other day in the month reads as available, so the calendar
 * answers one question — can they be booked that day or not.
 */
const unavailableDays = new Set([26, 31])

const availabilityStyle = {
  available: { dot: "bg-healthy", label: "Available" },
  unavailable: { dot: "bg-critical", label: "Not Available" },
}

/** `selected` is the day the activity is booked for, highlighted in the grid */
function AvailabilityCalendar({ selected }: { selected?: Date }) {
  // Opens on the booked month; the caller remounts on a new booking so this resets
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()))
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
          const state = unavailableDays.has(day.getDate()) ? "unavailable" : "available"
          const isSelected = !!selected && isSameDay(day, selected)
          const isToday = isSameDay(day, today)
          return (
            <div key={day.toISOString()} className="flex flex-col items-center py-0.5">
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-md",
                  !inMonth && "text-muted-foreground/50",
                  // The booked day is filled; today keeps a ring so both stay readable
                  isSelected && "bg-primary font-semibold text-primary-foreground",
                  isToday && !isSelected && "ring-1 ring-primary/50 font-semibold text-primary"
                )}
              >
                {format(day, "d")}
              </span>
              <span className={cn("mt-0.5 size-1.5 rounded-full", inMonth ? availabilityStyle[state].dot : "bg-transparent")} />
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

/** The intake form for a new inspection activity, reached from the Inspection Activities list */
export function AddInspectionActivityPage() {
  const form = useForm<AssignValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      enterprise: enterprises[0], plant: plants[0], area: "", category: "", activity: "",
      date: "", time: "", duration: "4 Hours", description: "", priority: "Medium",
    },
  })
  const { control, watch, setValue } = form

  /** Who the activity is booked to. Nothing is chosen until the dialog commits. */
  const [selected, setSelected] = useState<Elpremar | null>(null)
  const [assigning, setAssigning] = useState(false)

  const plant = watch("plant")
  const activity = watch("activity")

  // The scheduled date drives the calendar highlight; the dialog writes it on assign
  const scheduled = watch("date")
  const bookedDay = useMemo(() => {
    if (!scheduled) return undefined
    const d = parse(scheduled, "yyyy-MM-dd", new Date())
    return isValid(d) ? d : undefined
  }, [scheduled])

  // Everything already on someone's books, so the dialog can spot a clash
  const bookings = useMemo(
    () =>
      ([
        ...maintenanceActivities.map((m) => ({ elpremar: m.elpremar, date: m.scheduled, label: m.asset, plant: m.plant, enterprise: m.enterprise, slot: m.slot })),
        ...inspectionActivities.map((t) => ({ elpremar: t.elpremar, date: t.due, label: t.activity, plant: t.plant, enterprise: t.enterprise, slot: t.slot })),
      ] as (Omit<Booking, "elpremar" | "date"> & { elpremar?: string; date?: string })[]).filter(
        (b): b is Booking => !!b.elpremar && !!b.date
      ),
    []
  )

  /** The dialog settles the person, the day and the interval, so the form takes all three */
  const saveAssignment = ({ elpremar, date, slot }: AssignResult) => {
    setSelected(elpremar)
    setValue("date", format(date, "yyyy-MM-dd"), { shouldValidate: true })
    setValue("time", `${String(slot).padStart(2, "0")}:00`, { shouldValidate: true })
    setAssigning(false)
    toast.success(`${elpremar.name} assigned`, {
      description: `${format(date, "d MMM yyyy")}, ${slotLabel(slot)}`,
    })
  }

  const assign = form.handleSubmit(() => {
    if (!selected) {
      toast.error("Assign an ELPREMAR before adding the activity")
      return
    }
    // TODO: POST /inspection-activities
    toast.success(`Activity assigned to ${selected.name}`)
    form.reset()
    setSelected(null)
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Add Inspection Activity"
        breadcrumbs={[{ label: "Inspection Activities", to: "/inspection-activities" }, { label: "Add Inspection Activity" }]}
        actions={
          <>
            <Button variant="outline" size="sm" className={cn(controlSize, "bg-card")} asChild>
              <Link to="/inspection-activities"><ArrowLeft className="size-3.5" /> Back to Inspection Activities</Link>
            </Button>
          </>
        }
      />

      {/* The rail only exists once someone is assigned, so the form has the width until then */}
      <div className={cn("grid gap-5", selected && "xl:grid-cols-[1fr_24rem]")}>
        <SectionCard title="Assign Activity to ELPREMAR" hoverable={false}>
          <p className="-mt-1 mb-4 text-xs text-muted-foreground">Create and assign a new inspection activity for electrical asset assessment at the selected location.</p>
          <form onSubmit={assign} className="grid gap-4 md:grid-cols-6" noValidate>
            <SelectField control={control} name="enterprise" label="Enterprise" required options={enterprises} className="md:col-span-3" />
            <SelectField control={control} name="plant" label="Plant" required options={plants} className="md:col-span-3" />
            <SelectField control={control} name="area" label="Location / Area" required options={areas} className="md:col-span-2" />
            <SelectField control={control} name="category" label="Asset Category" required options={assetCategories} className="md:col-span-2" />
            <SelectField control={control} name="activity" label="Activity Type" required options={activityTypes} className="md:col-span-2" />
            <TextField control={control} name="date" label="Scheduled Date" required type="date" className="md:col-span-2" />
            <TextField control={control} name="time" label="Start Time" required type="time" className="md:col-span-2" />
            <SelectField control={control} name="duration" label="Estimated Duration" options={durations} className="md:col-span-2" />

            <div className="md:col-span-6">
              <div className="mb-2 text-sm font-medium">ELPREMAR <span className="text-destructive">*</span></div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant={selected ? "outline" : "default"} onClick={() => setAssigning(true)}>
                  <UserRound /> {selected ? "Change ELPREMAR" : "Assign ELPREMAR"}
                </Button>
                {selected ? (
                  <span className="text-xs">
                    <span className="font-semibold text-primary">{selected.name}</span>
                    <span className="text-muted-foreground"> · {selected.id} · {selected.department} Dept. | {selected.plant}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No ELPREMAR assigned yet — the scheduled date and time come from the booking.
                  </span>
                )}
              </div>
            </div>

            <TextareaField control={control} name="description" label="Task Description" required rows={2} className="md:col-span-6" />
            <SelectField control={control} name="priority" label="Priority" required options={priorities} className="md:col-span-2" />
            <div className="md:col-span-4">
              <div className="mb-2 text-sm font-medium">Attachments</div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-info-soft px-3 py-2 text-sm font-medium text-primary hover:bg-accent">
                <Paperclip className="size-4" /> Upload Files
                <input type="file" multiple accept=".pdf,image/png,image/jpeg" className="sr-only" />
              </label>
              <span className="ml-3 text-xs text-muted-foreground">PDF, JPG, PNG (Max 5 MB)</span>
            </div>
            <div className="flex justify-between gap-3 md:col-span-6">
              <Button type="button" variant="outline" className="min-w-24" onClick={() => form.reset()}>Clear</Button>
              <Button type="submit" className="min-w-36"><Send /> Add Activity</Button>
            </div>
          </form>
        </SectionCard>

        {/* The rail only has something to say once an ELPREMAR is on the activity */}
        {selected ? (
          <div className="space-y-5">
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

            <SectionCard title="ELPREMAR Details">
              <AvailabilityCalendar key={bookedDay?.toISOString() ?? "none"} selected={bookedDay} />
            </SectionCard>

            <SectionCard title={`Today's Tasks (${format(new Date(), "d MMM yyyy")})`} viewAllTo="/inspection-activities" contentClassName="px-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className={th}>#</TableHead><TableHead className={th}>Time</TableHead><TableHead className={th}>Location / Asset</TableHead><TableHead className={th}>Activity</TableHead><TableHead className={th}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaysTasks.map((t, i) => (
                    <TableRow key={t.time}>
                      <TableCell className={td}>{i + 1}</TableCell>
                      <TableCell className={td}>{t.time}</TableCell>
                      <TableCell className={td}>{t.asset}</TableCell>
                      <TableCell className={td}>{t.activity}</TableCell>
                      <TableCell className={td}><Badge variant={workStatus[t.status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">{workStatus[t.status].label}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </div>
        ) : null}
      </div>

      <AssignElpremarDialog
        key={assigning ? "assigning" : "idle"}
        target={
          assigning
            ? {
                id: "NEW",
                title: activity || "New Inspection Activity",
                subtitle: `${watch("area") || "Location not set"} · ${plant}`,
                plant,
                // A new activity has nobody on it and no approval step of its own
                approvable: false,
              }
            : null
        }
        bookings={bookings}
        onOpenChange={(open) => !open && setAssigning(false)}
        onAssign={saveAssignment}
      />
    </div>
  )
}
