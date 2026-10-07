import { useMemo, useState } from "react"
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { CheckCheck, ChevronLeft, ChevronRight, HardHat, Mail, MapPin, Phone, Search, TriangleAlert, UserRoundSearch } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { elpremars, type Elpremar } from "@/data/mock"
import { daySlots, mockElpremarSchedule, slotFor, slotLabel, type ScheduleEntry } from "@/data/occ-tables"
import { control } from "@/lib/data-table"

/** A job already on someone's books, taken from the operations tables (dd-MM-yyyy dates) */
export type Booking = { elpremar: string; date: string; label: string; plant: string; enterprise: string; slot?: number }

/** What the admin settled on: who, which day, which interval, and how to file it */
export type AssignResult = { elpremar: Elpremar; date: Date; slot: number; approved: boolean }

/** The row being assigned */
export type AssignTarget = {
  id: string
  title: string
  subtitle: string
  /** Where the work is; ELPREMARs currently assigned here are listed first */
  plant: string
  elpremar?: string
  date?: string
  /** The interval it currently sits in, so the dialog opens on it */
  slot?: number
  /** False for work with no approval step (inspection activities), which only gets reassigned */
  approvable?: boolean
  /** False once the work is done and its assignment is history — the panel becomes a view */
  reassignable?: boolean
}

type DayState = "off" | "leave" | "full" | "booked" | "free"

/**
 * Leave is deliberately absent: a day on leave still blocks booking through
 * `dayState`, but it is not called out in the calendar or its key.
 */
const dayStyle: Record<"free" | "booked" | "full", { dot: string; label: string }> = {
  free: { dot: "bg-healthy", label: "Available" },
  booked: { dot: "bg-info", label: "1 job booked" },
  full: { dot: "bg-critical", label: "Fully booked" },
}

const parseDate = (d: string) => parse(d, "dd-MM-yyyy", new Date())

function scheduleFor(e: Elpremar, bookings: Booking[]): ScheduleEntry[] {
  return [
    ...mockElpremarSchedule(e.id, e.available),
    ...bookings
      .filter((b) => b.elpremar === e.name)
      .map((b) => ({
        date: parseDate(b.date),
        kind: "job" as const,
        label: b.label,
        // Older rows carry no time, so derive a stable one from the job itself
        slot: b.slot ?? slotFor(b.label + b.date),
      })),
  ]
}

type JobLocation = { plant: string; enterprise: string }

/**
 * An ELPREMAR has no fixed location, only the site of the job they're assigned to:
 * their latest job up to today, else their next upcoming one, else none.
 */
function currentLocation(e: Elpremar, bookings: Booking[], today: Date): JobLocation | undefined {
  const jobs = bookings
    .filter((b) => b.elpremar === e.name)
    .map((b) => ({ ...b, when: parseDate(b.date) }))
    .sort((a, b) => a.when.getTime() - b.when.getTime())
  const job = jobs.filter((j) => !isBefore(today, j.when)).at(-1) ?? jobs[0]
  return job && { plant: job.plant, enterprise: job.enterprise }
}

function dayState(day: Date, entries: ScheduleEntry[]): DayState {
  const onDay = entries.filter((x) => isSameDay(x.date, day))
  if (onDay.some((x) => x.kind === "leave")) return "leave"
  if (day.getDay() === 0) return "off"
  // Work is booked by the interval, so a day is only full once no interval is left
  if (!openSlots(entries, day).length) return "full"
  return onDay.length ? "booked" : "free"
}

/** A day can take this job if it is not past, not off, and still has a free interval */
const bookable = (entries: ScheduleEntry[], day: Date, today: Date) =>
  !isBefore(day, today) && !["off", "leave", "full"].includes(dayState(day, entries))

/** Intervals already taken on `day`, mapped to the job sitting in each */
function busySlots(entries: ScheduleEntry[], day: Date) {
  return new Map(
    entries
      .filter((x) => x.kind === "job" && isSameDay(x.date, day) && x.slot !== undefined)
      .map((x) => [x.slot!, x.label] as const)
  )
}

/** Intervals still bookable on `day` — not taken, and not already gone if that day is today */
function openSlots(entries: ScheduleEntry[], day: Date) {
  const busy = busySlots(entries, day)
  const now = new Date()
  return daySlots.filter((h) => !busy.has(h) && !(isSameDay(day, now) && h <= now.getHours()))
}

function nextFreeDay(entries: ScheduleEntry[], today: Date) {
  for (let i = 0; i < 60; i++) {
    const d = addDays(today, i)
    if (dayState(d, entries) === "free") return d
  }
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)

function ScheduleCalendar({
  entries,
  selected,
  onSelect,
  readOnly,
}: {
  entries: ScheduleEntry[]
  selected?: Date
  onSelect: (d: Date) => void
  /** Viewing an existing booking: show the day, don't let it be changed */
  readOnly?: boolean
}) {
  const today = startOfDay(new Date())
  const [month, setMonth] = useState(() => startOfMonth(selected ?? today))
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) })

  return (
    <div>
      <div className="mb-1 flex items-center justify-between rounded-md bg-info-soft px-1 py-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          disabled={!readOnly && !isBefore(startOfMonth(today), month)}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Button>
        <span className="text-xs font-semibold">{format(month, "MMMM yyyy")}</span>
        <Button variant="ghost" size="icon-xs" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month">
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1 text-[0.65rem] font-medium text-muted-foreground">{d}</div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const state = dayState(day, entries)
          const canPick = !readOnly && inMonth && bookable(entries, day, today)
          const past = isBefore(day, today)
          const isSelected = selected && isSameDay(day, selected)
          const dot = inMonth && state in dayStyle && !(past && state === "free") ?dayStyle[state as keyof typeof dayStyle].dot : "bg-transparent"
          return (
            <div key={day.toISOString()} className="flex flex-col items-center py-0.5">
              <button
                type="button"
                disabled={!canPick}
                onClick={() => onSelect(day)}
                title={inMonth && state in dayStyle ? dayStyle[state as keyof typeof dayStyle].label : undefined}
                className={cn(
                  "flex size-7 items-center justify-center rounded-md tabular-nums transition-colors",
                  canPick && "hover:bg-muted",
                  !canPick && "cursor-not-allowed text-muted-foreground/50",
                  !inMonth && "invisible",
                  isSameDay(day, today) && !isSelected && "ring-1 ring-primary",
                  isSelected && "bg-primary font-semibold text-primary-foreground hover:bg-primary"
                )}
              >
                {format(day, "d")}
              </button>
              <span className={cn("mt-0.5 size-1.5 rounded-full", dot, past && "opacity-40")} />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[0.65rem] text-muted-foreground">
        {Object.values(dayStyle).map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", s.dot)} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * The chosen day broken into working intervals: the ones the ELPREMAR is
 * already on a job in are shown but locked, the rest can be booked.
 */
function SlotPicker({
  entries,
  day,
  slot,
  onSelect,
  readOnly,
}: {
  entries: ScheduleEntry[]
  day: Date
  slot?: number
  onSelect: (hour: number) => void
  readOnly?: boolean
}) {
  const busy = busySlots(entries, day)
  const open = openSlots(entries, day)

  return (
    <>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Time interval</span>
        <span className="text-[0.62rem] text-muted-foreground">{open.length} of {daySlots.length} free</span>
      </div>
      <div className="mt-1 space-y-1">
        {daySlots.map((hour) => {
          const job = busy.get(hour)
          const free = open.includes(hour)
          const picked = slot === hour
          // The booked interval is shown even when something else now sits in it
          const clash = picked && !!job
          return (
            <button
              key={hour}
              type="button"
              disabled={readOnly || !free}
              onClick={() => onSelect(hour)}
              title={job ?? (free ? "Available" : "Already passed")}
              aria-pressed={picked}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[0.7rem] ring-1 transition-colors",
                clash && "bg-critical-soft font-medium text-critical-soft-foreground ring-critical",
                picked && !clash && "bg-primary font-medium text-primary-foreground ring-primary",
                !picked && job && "bg-info-soft/70 text-muted-foreground ring-transparent",
                !picked && !job && !free && "text-muted-foreground/50 ring-transparent",
                !picked && free && "ring-foreground/10 hover:bg-muted"
              )}
            >
              <span className="shrink-0 tabular-nums">{slotLabel(hour)}</span>
              <span className="min-w-0 flex-1 truncate text-right">
                {job ?? (free ? "Free" : picked ? "Booked" : "Passed")}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

function ElpremarDetails({ e, location }: { e: Elpremar; location?: JobLocation }) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-3 ring-1 ring-foreground/10">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-attention-soft text-attention">
        <HardHat className="size-5" />
      </div>
      <div className="min-w-0 flex-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{e.name}</span>
          <Badge variant={e.available ? "healthy" : "critical"} className="rounded px-1.5 py-0 text-[0.65rem]">
            {e.available ? "Available" : "On Leave"}
          </Badge>
        </div>
        <div className="text-muted-foreground">{e.id} · {e.department} Department</div>
        <div className="mt-1.5 grid gap-x-4 gap-y-1 sm:grid-cols-2">
          <span className="flex items-center gap-1.5" title="Current job location">
            <MapPin className="size-3.5 text-primary" /> {location ? `${location.plant}, ${location.enterprise}` : "Not on any job"}
          </span>
          <span className="flex items-center gap-1.5"><Phone className="size-3.5 text-primary" /> {e.phone}</span>
          <span className="flex min-w-0 items-center gap-1.5 sm:col-span-2">
            <Mail className="size-3.5 shrink-0 text-primary" /> <span className="truncate">{e.email}</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Skills</span>
          {e.skills.map((s) => (
            <Badge key={s} variant="info" className="rounded px-1.5 py-0 text-[0.65rem]">{s}</Badge>
          ))}
        </div>
      </div>
    </div>
  )
}


/**
 * The scheduling panel: who the work belongs to, the day it sits on and the
 * interval within that day. Opens on what the row already has and is read-only
 * until Reassign, which brings in the ELPREMAR search and unlocks both. A target
 * with no ELPREMAR is a first assignment, so it opens in the search with Reassign
 * disabled and the commit button reading Assign.
 * Rendered inline on the details screen and inside the dialog on the dashboard.
 * Mount with a `key` per target so state resets.
 */
export function WorkSchedule({
  target,
  bookings,
  onAssign,
  leadingAction,
}: {
  target: AssignTarget
  bookings: Booking[]
  onAssign: (result: AssignResult) => void
  /** Sits before the panel's own buttons — the dialog puts its Cancel here */
  leadingAction?: React.ReactNode
}) {
  const today = startOfDay(new Date())

  // Don't count the row's own current booking against the person it holds, so
  // its own interval reads as its own rather than as a clash
  const otherBookings = useMemo(
    () => bookings.filter((b) => !(b.elpremar === target.elpremar && b.date === target.date && b.label === target.title)),
    [bookings, target]
  )

  const schedules = useMemo(
    () => new Map(elpremars.map((e) => [e.id, scheduleFor(e, otherBookings)])),
    [otherBookings]
  )

  const locations = useMemo(
    () => new Map(elpremars.map((e) => [e.id, currentLocation(e, otherBookings, startOfDay(new Date()))])),
    [otherBookings]
  )

  // Everyone is listed (the admin decides); those already assigned at this plant come first
  const byProximity = useMemo(() => {
    const here = (e: Elpremar) => locations.get(e.id)?.plant === target.plant
    return [...elpremars].sort((a, b) => Number(here(b)) - Number(here(a)))
  }, [locations, target])

  /** What the row arrived with — what the panel opens on, and what Back returns to */
  const booked = {
    id: elpremars.find((e) => e.name === target.elpremar)?.id ?? byProximity[0]?.id,
    date: target.date ? parseDate(target.date) : undefined,
    slot: target.slot,
  }

  // A row with nobody on it is a first assignment: open straight into the search,
  // since there is no existing booking to show or to go back to
  const fresh = !target.elpremar
  // Reassigning is a deliberate step: until then the booking is only on show
  const [reassigning, setReassigning] = useState(fresh)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(booked.id)
  const [date, setDate] = useState<Date | undefined>(booked.date)
  const [slot, setSlot] = useState<number | undefined>(booked.slot)

  const atSite = (e: Elpremar) => locations.get(e.id)?.plant === target.plant

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return byProximity
    return byProximity.filter((e) =>
      [e.name, e.id, locations.get(e.id)?.plant ?? "", e.department, ...e.skills].some((f) => f.toLowerCase().includes(q))
    )
  }, [query, byProximity, locations])

  const selected = elpremars.find((e) => e.id === selectedId)
  const entries = selected ? schedules.get(selected.id)! : []

  // Someone else's job sitting in the very interval this row is booked into
  const clash = date && slot !== undefined ? busySlots(entries, date).get(slot) : undefined

  /** Keep a chosen interval only while it is still open for this person on this day */
  const keepSlot = (sched: ScheduleEntry[], day?: Date, hour?: number) =>
    day && hour !== undefined && openSlots(sched, day).includes(hour) ? hour : undefined

  const pick = (e: Elpremar) => {
    setSelectedId(e.id)
    const sched = schedules.get(e.id)!
    // Keep the chosen day only if the new person is free on it too
    const day = date && bookable(sched, date, today) ? date : undefined
    setDate(day)
    setSlot(keepSlot(sched, day, slot))
  }

  const chooseDay = (day: Date) => {
    setDate(day)
    setSlot(keepSlot(entries, day, slot))
  }

  const startReassign = () => {
    setReassigning(true)
    // The booked day may be in the past, which is no longer a valid choice
    if (!date || !bookable(entries, date, today)) {
      setDate(undefined)
      setSlot(undefined)
    } else if (clash) setSlot(undefined)
  }

  const cancelReassign = () => {
    setReassigning(false)
    setQuery("")
    setSelectedId(booked.id)
    setDate(booked.date)
    setSlot(booked.slot)
  }

  // Finished work keeps its assignment, so the panel is then a view of the booking
  const canReassign = target.reassignable !== false
  const chosen = selected && date && slot !== undefined
  // Work raised already signed off has no approval step, so Approve stays out of reach
  const canApprove = !!chosen && !clash && target.approvable !== false
  const commit = () => chosen && onAssign({ elpremar: selected, date, slot, approved: target.approvable !== false })

  return (
    <>
      <div className={cn("grid gap-4", reassigning && "md:grid-cols-[17rem_1fr]")}>
        {/* The ELPREMAR search only exists once the admin has chosen to reassign */}
        {reassigning && (
          <div className="flex min-h-0 flex-col gap-2">
            <InputGroup className="h-8">
              <InputGroupAddon><Search /></InputGroupAddon>
              <InputGroupInput
                autoFocus
                placeholder="Search name, ID, plant, skill…"
                value={query}
                onChange={(ev) => setQuery(ev.target.value)}
                className="text-xs"
              />
            </InputGroup>
            <div className="max-h-48 space-y-1 overflow-y-auto pr-1 md:max-h-[26rem]">
              {results.map((e) => {
                const free = nextFreeDay(schedules.get(e.id)!, today)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => pick(e)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                      e.id === selectedId && "bg-info-soft ring-1 ring-primary/40 hover:bg-info-soft"
                    )}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[0.65rem] font-semibold">
                      {initials(e.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.name}</span>
                      <span className="block truncate text-[0.65rem] text-muted-foreground">{e.id} · {locations.get(e.id)?.plant ?? "Not on any job"}</span>
                      {atSite(e) && (
                        <Badge variant="healthy" className="mt-0.5 rounded px-1 py-0 text-[0.62rem]">
                          <MapPin className="size-2.5!" /> At {target.plant}
                        </Badge>
                      )}
                    </span>
                    <span className="shrink-0 text-right text-[0.62rem] leading-tight">
                      <span className="block text-muted-foreground">Next free</span>
                      <span className="block font-medium tabular-nums">{free ? format(free, "d MMM") : "—"}</span>
                    </span>
                  </button>
                )
              })}
              {results.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No ELPREMAR matches “{query}”.</p>
              )}
            </div>
          </div>
        )}

        {selected ? (
          <div className="grid content-start gap-3 lg:grid-cols-[1fr_16rem]">
            <div className="space-y-3 lg:col-span-2">
              <ElpremarDetails e={selected} location={locations.get(selected.id)} />
            </div>
            <div className="rounded-lg p-2 ring-1 ring-foreground/10">
              <ScheduleCalendar
                key={`${selected.id}-${reassigning}`}
                entries={entries}
                selected={date}
                onSelect={chooseDay}
                readOnly={!reassigning}
              />
            </div>
            <div className="rounded-lg p-3 text-xs ring-1 ring-foreground/10">
              <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Scheduled date</div>
              {date ? (
                <>
                  <div className="mt-1 text-sm font-semibold">{format(date, "EEE, d MMM yyyy")}</div>
                  <SlotPicker entries={entries} day={date} slot={slot} onSelect={setSlot} readOnly={!reassigning} />
                </>
              ) : (
                <p className="mt-1 text-muted-foreground">Pick an available day in the calendar.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
            <UserRoundSearch className="size-8 text-muted-foreground/60" />
            Search and select an ELPREMAR to see their details and schedule.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <p className="mr-auto text-xs text-muted-foreground">
          {clash ? (
            <span className="flex items-center gap-1.5 font-medium text-critical">
              <TriangleAlert className="size-3.5" />
              {slotLabel(slot!)} is already taken by {clash} — reassign to approve.
            </span>
          ) : chosen ? (
            <><span className="font-medium text-foreground">{selected.name}</span> · {format(date, "EEE, d MMM")} · {slotLabel(slot)}</>
          ) : (
            "Pick a day and a free time interval."
          )}
        </p>
        {leadingAction}
        {canReassign ? (
          fresh ? (
            // Nothing to reassign from until this first assignment is made
            <Button variant="secondary" size="sm" className={control} disabled title="Nobody is assigned yet">
              Reassign
            </Button>
          ) : reassigning ? (
            <Button variant="secondary" size="sm" className={control} onClick={cancelReassign}>Back</Button>
          ) : (
            <Button variant="secondary" size="sm" className={control} onClick={startReassign}>Reassign</Button>
          )
        ) : null}
        {target.approvable === false ? (
          // Work with no approval step only ever commits an assignment, so until the
          // admin chooses to reassign there is nothing for the primary button to do
          reassigning ? (
            <Button size="sm" className={control} disabled={!chosen || !!clash} onClick={commit}>
              <CheckCheck className="size-3.5" /> {fresh ? "Assign" : "Reassign"}
            </Button>
          ) : null
        ) : (
          <Button size="sm" className={control} disabled={!canApprove} onClick={commit}>
            <CheckCheck className="size-3.5" /> Approve
          </Button>
        )}
      </div>
    </>
  )
}

/** The dashboard's row action: the same panel, in a dialog. */
export function AssignElpremarDialog({
  target,
  bookings,
  onOpenChange,
  onAssign,
}: {
  target: AssignTarget | null
  bookings: Booking[]
  onOpenChange: (open: boolean) => void
  onAssign: (result: AssignResult) => void
}) {
  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-5 sm:max-w-4xl!">
        <DialogHeader>
          <DialogTitle>Scheduled Work</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{target?.title}</span> · {target?.subtitle}
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <WorkSchedule
            target={target}
            bookings={bookings}
            onAssign={onAssign}
            leadingAction={
              <DialogClose asChild>
                <Button variant="outline" size="sm" className={control}>Cancel</Button>
              </DialogClose>
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
