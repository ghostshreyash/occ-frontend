import { useMemo } from "react"
import { Link } from "react-router"
import { format, parse, startOfDay } from "date-fns"
import {
  ArrowRight,
  BookOpen,
  CircleCheckBig,
  ClipboardList,
  FileText,
  Hourglass,
  Mail,
  Phone,
  Play,
  QrCode,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react"
import { cn } from "cn"

import { SectionCard } from "@/components/common/section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { elpremarRecords } from "@/data/elpremar-data"
import { assetCategories, roleStream } from "@/data/master-data"
import { inspectionActivities, maintenanceActivities, priorityTone, slotLabel } from "@/data/occ-tables"
import { useAuth } from "@/lib/auth/context"
import { td, th } from "@/lib/data-table"
import { workStatus, type WorkStatus } from "@/lib/status"

const parseDate = (d: string) => startOfDay(parse(d, "dd-MM-yyyy", new Date()))
const isToday = (d: string) => parseDate(d).getTime() === startOfDay(new Date()).getTime()

/** One job on the engineer's day, from either book */
type DayTask = {
  id: string
  slot: number
  asset: string
  location: string
  activity: string
  priority: string
  status: WorkStatus
}

/** The four counters across the top of the engineer's day */
function Counter({
  icon: Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof ClipboardList
  label: string
  value: number
  note: string
  tone: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5 ring-1 ring-foreground/10">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone)}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[0.7rem] text-muted-foreground">{label}</div>
        <div className="text-xl leading-tight font-bold tabular-nums">{value}</div>
        <div className="truncate text-[0.65rem] text-muted-foreground">{note}</div>
      </div>
    </div>
  )
}

const quickActions = [
  { icon: QrCode, label: "Scan Asset QR", detail: "View Asset Details", tone: "bg-info-soft text-info" },
  { icon: FileText, label: "Log Test Results", detail: "Record Measurements", tone: "bg-info-soft text-info" },
  { icon: TriangleAlert, label: "Report an Issue", detail: "Raise a Ticket", tone: "bg-critical-soft text-critical" },
  { icon: BookOpen, label: "View SOP / Manual", detail: "Safety & Procedures", tone: "bg-highlight-soft text-highlight" },
]

/**
 * The ELPREMAR's own screen: the work in front of them today, the assets at
 * their site, and who they are. Nothing from the command centre appears here —
 * no enterprise rollups, no approvals, no other engineer's book.
 */
export function EvitaDashboardPage() {
  const { user } = useAuth()

  // The signed-in engineer, falling back to the first of the roster for the demo
  const me = useMemo(
    () => elpremarRecords.find((e) => e.name === user?.name) ?? elpremarRecords[0],
    [user]
  )

  const { today, counts } = useMemo(() => {
    const mine = [
      ...maintenanceActivities
        .filter((m) => m.elpremar === me.name)
        .map((m) => ({ id: m.id, slot: m.slot, asset: m.asset, location: m.plant, activity: m.type, priority: "Medium", status: m.status, date: m.scheduled })),
      ...inspectionActivities
        .filter((t) => t.elpremar === me.name)
        .map((t) => ({ id: t.id, slot: t.slot, asset: t.asset, location: t.plant, activity: t.activity, priority: t.priority, status: t.status, date: t.due })),
    ]

    const done = mine.filter((r) => r.status === "completed").length
    return {
      today: mine.filter((r) => isToday(r.date)).sort((a, b) => a.slot - b.slot) as DayTask[],
      counts: {
        today: mine.filter((r) => isToday(r.date)).length,
        pending: mine.filter((r) => isToday(r.date) && r.status !== "in_progress").length,
        running: mine.filter((r) => isToday(r.date) && r.status === "in_progress").length,
        done,
        // Past its day and still not finished
        overdue: mine.filter((r) => r.status !== "completed" && parseDate(r.date) < startOfDay(new Date())).length,
        total: mine.length,
      },
    }
  }, [me])

  /** Asset categories at this engineer's site, counted off the shared master list */
  const categories = useMemo(() => {
    const seed = [...me.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7)
    return assetCategories.map((name, i) => ({ name, count: 6 + ((seed + i * 13) % 24) }))
  }, [me])

  const totalAssets = categories.reduce((n, c) => n + c.count, 0)

  return (
    <div className="space-y-3">
      {/* ---------- Welcome ---------- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-foreground">Welcome, {me.name}!</h2>
          <p className="text-xs text-muted-foreground">
            Here are your assigned activities for today. Let&apos;s keep our assets reliable and safe.
          </p>
        </div>
        <div className="flex max-w-md items-center gap-3 rounded-md bg-info-soft px-3 py-2 text-[0.7rem] italic">
          <span>“Every inspection prevents tomorrow&apos;s failure.”</span>
          <span className="ml-auto shrink-0 text-right font-semibold not-italic text-primary">
            Safe People
            <span className="block font-normal">Reliable Assets</span>
          </span>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-3">
          {/* ---------- The day at a glance ---------- */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Counter icon={ClipboardList} label="Today's Tasks" value={counts.today} note={`${counts.pending} Pending | ${counts.running} In Progress`} tone="bg-info-soft text-info" />
            <Counter icon={CircleCheckBig} label="Completed" value={counts.done} note="This Week" tone="bg-healthy-soft text-healthy" />
            <Counter icon={Hourglass} label="Overdue" value={counts.overdue} note={counts.overdue ? "Needs attention" : "Good Job!"} tone="bg-attention-soft text-attention" />
            <Counter icon={ClipboardList} label="Total Assigned" value={counts.total} note="This Week" tone="bg-highlight-soft text-highlight" />
          </div>

          {/* ---------- Today's work ---------- */}
          <SectionCard title="Today's Assigned Tasks" viewAllTo="/evita/my-tasks" contentClassName="px-2" hoverable={false}>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className={cn(th, "w-10")}>#</TableHead>
                  <TableHead className={th}>Time</TableHead>
                  <TableHead className={th}>Asset / Location</TableHead>
                  <TableHead className={th}>Activity</TableHead>
                  <TableHead className={th}>Priority</TableHead>
                  <TableHead className={th}>Status</TableHead>
                  <TableHead className={cn(th, "text-center")}>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {today.map((t, i) => (
                  <TableRow key={t.id}>
                    <TableCell className={cn(td, "tabular-nums text-muted-foreground")}>{i + 1}</TableCell>
                    <TableCell className={cn(td, "tabular-nums whitespace-nowrap")}>{slotLabel(t.slot).split(" - ")[0]}</TableCell>
                    <TableCell className={td}>
                      <span className="font-medium">{t.asset}</span>
                      <span className="block text-[0.65rem] text-muted-foreground">{t.location}</span>
                    </TableCell>
                    <TableCell className={cn(td, "max-w-44 whitespace-normal")}>{t.activity}</TableCell>
                    <TableCell className={td}>
                      <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[t.priority as keyof typeof priorityTone])}>
                        {t.priority}
                      </span>
                    </TableCell>
                    <TableCell className={td}>
                      <Badge variant={workStatus[t.status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">
                        {workStatus[t.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(td, "py-0.5 text-center")}>
                      {t.status === "in_progress" ? (
                        <Button size="sm" className="h-7 px-2.5 text-[0.7rem]">
                          Continue <ArrowRight className="size-3" />
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 bg-card px-2.5 text-[0.7rem]">
                          <Play className="size-3" /> Start
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {today.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-xs text-muted-foreground">
                      Nothing booked for today.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </SectionCard>

          {/* ---------- What is on site ---------- */}
          <SectionCard
            title="Asset Categories at Your Location"
            viewAllTo="/evita/assets"
            hoverable={false}
            actions={<span className="text-[0.7rem] text-muted-foreground">Total Assets: {totalAssets}</span>}
          >
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
              {categories.map((c) => (
                <Link
                  key={c.name}
                  to="/evita/assets"
                  className="rounded-lg bg-muted/40 px-1.5 py-2 text-center ring-1 ring-foreground/10 transition-colors hover:bg-muted"
                >
                  <div className="truncate text-[0.65rem] font-semibold" title={c.name}>{c.name}</div>
                  <div className="text-[0.6rem] text-muted-foreground">{c.count} Assets</div>
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ---------- Who they are, and the shortcuts they use ---------- */}
        <div className="space-y-3">
          <Tabs defaultValue="details">
            <TabsList className="w-full">
              <TabsTrigger value="details" className="flex-1 text-xs">My Details</TabsTrigger>
              <TabsTrigger value="assignment" className="flex-1 text-xs">Assignment Info</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <SectionCard title="" hoverable={false} className="mt-2">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-attention-soft text-attention">
                    <UserRound className="size-6" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="text-sm font-semibold">{me.name}</div>
                    <div className="text-muted-foreground">{me.designation} | {me.id}</div>
                    <div className="text-muted-foreground">{me.department} Department</div>
                    <div className="text-muted-foreground">{me.plant}, {me.enterprise}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 border-t pt-2.5 text-xs">
                  <div className="flex items-center gap-1.5"><Phone className="size-3.5 text-primary" /> +91 98765 43210</div>
                  <div className="flex items-center gap-1.5"><Mail className="size-3.5 shrink-0 text-primary" /> <span className="truncate">{me.name.toLowerCase().replace(/\s+/g, ".")}@olivineglobal.com</span></div>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="assignment">
              <SectionCard title="" hoverable={false} className="mt-2">
                <dl className="space-y-2 text-xs">
                  {[
                    ["Role", me.roles.map(roleStream).join(", ")],
                    ["Posting", me.plant],
                    ["Enterprise", me.enterprise],
                    ["Certified Until", me.certifiedUntil],
                    ["Joined", me.joined],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3 border-b pb-1.5 last:border-0 last:pb-0">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              </SectionCard>
            </TabsContent>
          </Tabs>

          <div className="flex items-start gap-2.5 rounded-lg bg-healthy-soft px-3 py-2.5 ring-1 ring-foreground/10">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-healthy" />
            <div className="text-xs">
              <div className="font-semibold">Safety First</div>
              <p className="text-[0.7rem] text-muted-foreground">
                Follow all safety procedures. Report any unsafe condition immediately.
              </p>
            </div>
          </div>

          <SectionCard title="Quick Actions" hoverable={false}>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  className="flex items-start gap-2 rounded-lg px-2 py-2 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted"
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", a.tone)}>
                    <a.icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.7rem] font-semibold">{a.label}</span>
                    <span className="block truncate text-[0.62rem] text-muted-foreground">{a.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recent Notifications" viewAllTo="/evita/my-tasks" hoverable={false}>
            <ul className="space-y-2 text-xs">
              {today.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1 truncate">{t.activity}: {t.asset}</span>
                  <span className="shrink-0 text-[0.65rem] tabular-nums text-muted-foreground">
                    {slotLabel(t.slot).split(" - ")[0]}
                  </span>
                </li>
              ))}
              {today.length === 0 ? <li className="text-muted-foreground">Nothing new today.</li> : null}
            </ul>
          </SectionCard>
        </div>
      </div>

      <p className="pt-1 text-center text-[0.65rem] text-muted-foreground">
        {format(new Date(), "EEEE, d MMM yyyy")} · Reliable Assets. Safer Operations. A Greener Tomorrow.
      </p>
    </div>
  )
}
