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
import { ChevronLeft, ChevronRight, HardHat, Mail, MapPin, Phone, Search, UserRoundSearch } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { elpremars, type Elpremar } from "@/data/mock"
import { mockElpremarSchedule, type ScheduleEntry } from "@/data/occ-tables"

/** A job already on someone's books, taken from the operations tables (dd-MM-yyyy dates) */
export type Booking = { elpremar: string; date: string; label: string; plant: string; enterprise: string }

/** The row being assigned */
export type AssignTarget = {
  id: string
  title: string
  subtitle: string
  /** Where the work is; ELPREMARs currently assigned here are listed first */
  plant: string
  elpremar?: string
  date?: string
}

type DayState = "off" | "leave" | "full" | "booked" | "free"

const dayStyle: Record<"free" | "booked" | "full" | "leave", { dot: string; label: string }> = {
  free: { dot: "bg-healthy", label: "Available" },
  booked: { dot: "bg-info", label: "1 job booked" },
  full: { dot: "bg-critical", label: "Fully booked" },
  leave: { dot: "bg-attention", label: "On leave" },
}

const selectable = (s: DayState, day: Date, today: Date) => !isBefore(day, today) && (s === "free" || s === "booked")
const parseDate = (d: string) => parse(d, "dd-MM-yyyy", new Date())

function scheduleFor(e: Elpremar, bookings: Booking[]): ScheduleEntry[] {
  return [
    ...mockElpremarSchedule(e.id, e.available),
    ...bookings
      .filter((b) => b.elpremar === e.name)
      .map((b) => ({ date: parseDate(b.date), kind: "job" as const, label: b.label })),
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
  const jobs = onDay.length
  return jobs >= 2 ? "full" : jobs === 1 ? "booked" : "free"
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
}: {
  entries: ScheduleEntry[]
  selected?: Date
  onSelect: (d: Date) => void
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
          disabled={!isBefore(startOfMonth(today), month)}
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
          const canPick = inMonth && selectable(state, day, today)
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
            <Badge key={s} variant="info" className="rounded px-1.5 py-0 text-[0.62rem]">{s}</Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Search an ELPREMAR, review their details and schedule, then pick a day to
 * assign the work item. Mount with a `key` per target so state resets.
 */
export function AssignElpremarDialog({
  target,
  bookings,
  onOpenChange,
  onAssign,
}: {
  target: AssignTarget | null
  bookings: Booking[]
  onOpenChange: (open: boolean) => void
  onAssign: (elpremar: Elpremar, date: Date) => void
}) {
  const today = startOfDay(new Date())
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(() => elpremars.find((e) => e.name === target?.elpremar)?.id)
  const [date, setDate] = useState<Date | undefined>()

  // Don't count the row's own current booking against the person it's already assigned to
  const otherBookings = useMemo(
    () => bookings.filter((b) => !(b.elpremar === target?.elpremar && b.date === target?.date && b.label === target?.title)),
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

  const atSite = (e: Elpremar) => locations.get(e.id)?.plant === target?.plant

  // Everyone is listed (the admin decides); those already assigned at this plant come first
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const here = (e: Elpremar) => locations.get(e.id)?.plant === target?.plant
    return elpremars
      .filter((e) =>
        !q || [e.name, e.id, locations.get(e.id)?.plant ?? "", e.department, ...e.skills].some((f) => f.toLowerCase().includes(q))
      )
      .sort((a, b) => Number(here(b)) - Number(here(a)))
  }, [query, locations, target])

  const selected = elpremars.find((e) => e.id === selectedId)
  const entries = selected ? schedules.get(selected.id)! : []
  const jobsOnDate = date ? entries.filter((x) => x.kind === "job" && isSameDay(x.date, date)) : []

  const pick = (e: Elpremar) => {
    setSelectedId(e.id)
    // Keep the chosen day only if the new person is free on it too
    if (date && !selectable(dayState(date, schedules.get(e.id)!), date, today)) setDate(undefined)
  }

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-5 sm:max-w-4xl!">
        <DialogHeader>
          <DialogTitle>{target?.elpremar ? "Reassign ELPREMAR" : "Assign ELPREMAR"}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{target?.title}</span> · {target?.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[17rem_1fr]">
          {/* Search + results */}
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
                        <Badge variant="healthy" className="mt-0.5 rounded px-1 py-0 text-[0.58rem]">
                          <MapPin className="size-2.5!" /> At {target?.plant}
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

          {/* Details + schedule */}
          {selected ? (
            <div className="grid content-start gap-3 lg:grid-cols-[1fr_15rem]">
              <div className="space-y-3 lg:col-span-2">
                <ElpremarDetails e={selected} location={locations.get(selected.id)} />
              </div>
              <div className="rounded-lg p-2 ring-1 ring-foreground/10">
                <ScheduleCalendar key={selected.id} entries={entries} selected={date} onSelect={setDate} />
              </div>
              <div className="rounded-lg p-3 text-xs ring-1 ring-foreground/10">
                <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Scheduled date</div>
                {date ? (
                  <>
                    <div className="mt-1 text-sm font-semibold">{format(date, "EEE, d MMM yyyy")}</div>
                    <div className="mt-3 text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Already booked that day
                    </div>
                    {jobsOnDate.length ? (
                      <ul className="mt-1 space-y-1">
                        {jobsOnDate.map((j, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-info" /> {j.label}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-muted-foreground">Nothing — the full day is free.</p>
                    )}
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

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button size="sm" disabled={!selected || !date} onClick={() => selected && date && onAssign(selected, date)}>
            Assign{selected && date ? ` ${selected.name} · ${format(date, "d MMM")}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
