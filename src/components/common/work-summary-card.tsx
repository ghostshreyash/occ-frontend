import { useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { CheckCircle2, CircleDot, CirclePause, Clock, LoaderCircle, UserCheck } from "lucide-react"
import { cn } from "cn"

import { maintenanceProgress, supportTickets, taskQueue } from "@/data/occ-tables"
import { workStatus, type WorkStatus } from "@/lib/status"

/** Order matters: the segmented bar reads left to right from done to not-started */
const STATUS_ORDER: { key: WorkStatus; icon: typeof CheckCircle2; bar: string; chip: string; ring: string }[] = [
  { key: "completed", icon: CheckCircle2, bar: "bg-healthy", chip: "bg-healthy-soft text-healthy-soft-foreground", ring: "ring-healthy/25" },
  { key: "closed", icon: CirclePause, bar: "bg-neutral", chip: "bg-neutral-soft text-neutral-soft-foreground", ring: "ring-neutral/25" },
  { key: "in_progress", icon: LoaderCircle, bar: "bg-info", chip: "bg-info-soft text-info-soft-foreground", ring: "ring-info/25" },
  { key: "assigned", icon: UserCheck, bar: "bg-highlight", chip: "bg-highlight-soft text-highlight-soft-foreground", ring: "ring-highlight/25" },
  { key: "pending", icon: Clock, bar: "bg-attention", chip: "bg-attention-soft text-attention-soft-foreground", ring: "ring-attention/25" },
  { key: "open", icon: CircleDot, bar: "bg-critical", chip: "bg-critical-soft text-critical-soft-foreground", ring: "ring-critical/25" },
]

/**
 * Roll-up of every work item for one enterprise: maintenance, inspections and
 * tickets counted together by status, with a segmented bar showing the mix.
 * Sits above the detail so the state of the account reads in one glance.
 */
export function WorkSummaryCard({ enterprise, className }: { enterprise: string; className?: string }) {
  const reduced = useReducedMotion()

  const { counts, total, streams } = useMemo(() => {
    const mine = <T extends { enterprise: string }>(rows: T[]) => rows.filter((r) => r.enterprise === enterprise)
    const maintenance = mine(maintenanceProgress)
    const tasks = mine(taskQueue)
    const tickets = mine(supportTickets)
    const all = [...maintenance, ...tasks, ...tickets]

    const counts = Object.fromEntries(
      STATUS_ORDER.map((s) => [s.key, all.filter((r) => r.status === s.key).length])
    ) as Record<WorkStatus, number>

    return {
      counts,
      total: all.length,
      streams: [
        { label: "Maintenance", value: maintenance.length },
        { label: "Inspections", value: tasks.length },
        { label: "Tickets", value: tickets.length },
      ],
    }
  }, [enterprise])

  const present = STATUS_ORDER.filter((s) => counts[s.key] > 0)
  const openWork = total - counts.completed - counts.closed

  /* Children stagger in; reduced-motion users get the end state with no movement */
  const container = {
    hidden: {},
    shown: { transition: { staggerChildren: reduced ? 0 : 0.05, delayChildren: reduced ? 0 : 0.08 } },
  }
  const tile = reduced
    ? { hidden: { opacity: 1 }, shown: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8, scale: 0.97 },
        shown: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 320, damping: 24 } },
      }

  return (
    <motion.section
      initial="hidden"
      animate="shown"
      variants={container}
      className={cn("rounded-lg bg-card p-3 shadow-xs ring-1 ring-foreground/10", className)}
    >
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold">Work Summary</h3>
        {/* One atomic status line rather than a bare number, so it announces meaningfully */}
        <p role="status" aria-atomic="true" className="text-[0.7rem] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{openWork}</span> of{" "}
          <span className="tabular-nums">{total}</span> items still open
        </p>
      </div>

      {/* Segmented bar: proportions of the whole at a glance */}
      <div className="mb-3 flex h-2 w-full gap-px overflow-hidden rounded-full bg-muted">
        {present.map((s) => (
          <motion.span
            key={s.key}
            title={`${workStatus[s.key].label}: ${counts[s.key]}`}
            className={cn("h-full first:rounded-l-full last:rounded-r-full", s.bar)}
            initial={{ width: 0 }}
            animate={{ width: `${(counts[s.key] / total) * 100}%` }}
            transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STATUS_ORDER.map((s) => {
          const n = counts[s.key]
          const meta = workStatus[s.key]
          return (
            <motion.div
              key={s.key}
              variants={tile}
              whileHover={reduced || n === 0 ? undefined : { y: -2, transition: { type: "spring", stiffness: 400, damping: 22 } }}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 ring-1 transition-colors",
                n > 0 ? cn(s.chip, s.ring) : "bg-muted/40 text-muted-foreground ring-transparent"
              )}
            >
              <s.icon className={cn("size-4 shrink-0", n > 0 && s.key === "in_progress" && !reduced && "animate-spin [animation-duration:3s]")} />
              <div className="min-w-0">
                <div className="text-base leading-none font-bold tabular-nums">{n}</div>
                <div className="mt-0.5 truncate text-[0.62rem] leading-none">{meta.label}</div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2 text-[0.7rem] text-muted-foreground">
        {streams.map((s) => (
          <span key={s.label}>
            {s.label} <span className="font-semibold tabular-nums text-foreground">{s.value}</span>
          </span>
        ))}
      </div>
    </motion.section>
  )
}
