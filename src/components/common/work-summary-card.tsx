import { useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { ClipboardList, LifeBuoy, Wrench } from "lucide-react"
import { cn } from "cn"

import { allSupportTickets, inspectionActivities, maintenanceActivities } from "@/data/occ-tables"
import { workStatus, type WorkStatus } from "@/lib/status"

/** Order matters: the segmented bar reads left to right from done to not-started */
const STATUS_ORDER: { key: WorkStatus; bar: string; dot: string }[] = [
  { key: "completed", bar: "bg-healthy", dot: "bg-healthy" },
  { key: "closed", bar: "bg-neutral", dot: "bg-neutral" },
  { key: "in_progress", bar: "bg-info", dot: "bg-info" },
  { key: "assigned", bar: "bg-highlight", dot: "bg-highlight" },
  { key: "pending", bar: "bg-attention", dot: "bg-attention" },
  { key: "open", bar: "bg-critical", dot: "bg-critical" },
]

const DONE: WorkStatus[] = ["completed", "closed"]

type Stream = {
  key: string
  label: string
  icon: typeof Wrench
  tone: string
  rows: { status: WorkStatus }[]
}

/** One stream's card: total, status mix, and a per-status breakdown */
function StreamCard({ stream, reduced }: { stream: Stream; reduced: boolean | null }) {
  const total = stream.rows.length
  const counts = STATUS_ORDER.map((s) => ({ ...s, n: stream.rows.filter((r) => r.status === s.key).length }))
  const present = counts.filter((c) => c.n > 0)
  const open = stream.rows.filter((r) => !DONE.includes(r.status)).length
  const donePct = total > 0 ? Math.round(((total - open) / total) * 100) : 0

  const card = reduced
    ? { hidden: { opacity: 1 }, shown: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 10 },
        shown: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 26 } },
      }

  return (
    <motion.section
      variants={card}
      whileHover={reduced ? undefined : { y: -2, transition: { type: "spring", stiffness: 400, damping: 22 } }}
      className="flex flex-col rounded-lg bg-card p-3 shadow-xs ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
    >
      <header className="flex items-center gap-2">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", stream.tone)}>
          <stream.icon className="size-4" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-xs font-semibold">{stream.label}</h3>
        <span className="text-xl leading-none font-bold tabular-nums">{total}</span>
      </header>

      {/* Completion, stated rather than left to be inferred from the bar */}
      <p role="status" aria-atomic="true" className="mt-1.5 text-[0.7rem] text-muted-foreground">
        {total === 0 ? (
          "Nothing recorded yet"
        ) : open === 0 ? (
          <span className="font-medium text-healthy-soft-foreground">All complete</span>
        ) : (
          <>
            <span className="font-semibold tabular-nums text-foreground">{open}</span> still open ·{" "}
            <span className="tabular-nums">{donePct}%</span> done
          </>
        )}
      </p>

      <div className="mt-2 flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-muted">
        {present.map((c, i) => (
          <motion.span
            key={c.key}
            title={`${workStatus[c.key].label}: ${c.n}`}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", c.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${(c.n / total) * 100}%` }}
            transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 + i * 0.04 }}
          />
        ))}
      </div>

      <ul className="mt-2.5 space-y-1">
        {present.length === 0 ? (
          <li className="text-[0.7rem] text-muted-foreground">No items</li>
        ) : (
          present.map((c) => (
            <li key={c.key} className="flex items-center gap-1.5 text-[0.7rem]">
              <span className={cn("size-1.5 shrink-0 rounded-full", c.dot)} />
              <span className="flex-1 truncate text-muted-foreground">{workStatus[c.key].label}</span>
              <span className="font-semibold tabular-nums">{c.n}</span>
            </li>
          ))
        )}
      </ul>
    </motion.section>
  )
}

/**
 * Three cards, one per work stream, each with its own status mix.
 * Sits above the detail so the state of the account reads in one glance.
 */
export function WorkSummaryCard({
  enterprise,
  elpremar,
  className,
}: {
  /** Narrow to one enterprise's work */
  enterprise?: string
  /** Narrow to one ELPREMAR's assigned work */
  elpremar?: string
  className?: string
}) {
  const reduced = useReducedMotion()

  const streams = useMemo<Stream[]>(() => {
    const mine = <T extends { enterprise: string; elpremar?: string }>(rows: T[]) =>
      rows.filter(
        (r) => (enterprise ? r.enterprise === enterprise : true) && (elpremar ? r.elpremar === elpremar : true)
      )
    return [
      { key: "maintenance", label: "Maintenance Activities", icon: Wrench, tone: "bg-info-soft text-info", rows: mine(maintenanceActivities) },
      { key: "tasks", label: "Inspection Tasks", icon: ClipboardList, tone: "bg-highlight-soft text-highlight", rows: mine(inspectionActivities) },
      { key: "tickets", label: "Support Tickets", icon: LifeBuoy, tone: "bg-attention-soft text-attention", rows: mine(allSupportTickets) },
    ]
  }, [enterprise, elpremar])

  return (
    <motion.div
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: reduced ? 0 : 0.08 } } }}
      className={cn("grid gap-2 md:grid-cols-3", className)}
    >
      {streams.map((s) => (
        <StreamCard key={s.key} stream={s} reduced={reduced} />
      ))}
    </motion.div>
  )
}
