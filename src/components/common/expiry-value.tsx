import { BadgeCheck, CalendarClock, ShieldAlert } from "lucide-react"

import { daysUntil } from "@/data/elpremar-data"
import { cn } from "@/lib/utils"

/**
 * A certificate expiry date, coloured by how much life it has left, plus the
 * time remaining in words. A lapsed certificate must never read as green -
 * dispatching an ELPREMAR on one is the mistake this register exists to catch.
 */
export function ExpiryValue({
  validTill,
  relative = true,
  className,
}: {
  validTill: string
  /** Show "in 4 months" / "expired 12 days ago" beside the date */
  relative?: boolean
  className?: string
}) {
  const days = daysUntil(validTill)
  const state = days < 0 ? "expired" : days <= 90 ? "expiring" : "valid"

  const { Icon, colour, note } = {
    expired: {
      Icon: ShieldAlert,
      colour: "text-critical",
      note: `expired ${Math.abs(days)}d ago`,
    },
    expiring: {
      Icon: CalendarClock,
      colour: "text-attention",
      note: days === 0 ? "expires today" : `${days}d left`,
    },
    valid: {
      Icon: BadgeCheck,
      colour: "text-healthy",
      note: `${Math.round(days / 30)} mo left`,
    },
  }[state]

  return (
    <span className={cn("flex items-center gap-1", className)}>
      <Icon className={cn("size-3.5 shrink-0", colour)} />
      <span className={cn("tabular-nums", state === "expired" && "text-critical")}>{validTill}</span>
      {relative ? (
        <span className={cn("text-[0.65rem]", state === "valid" ? "text-muted-foreground" : colour)}>{note}</span>
      ) : null}
    </span>
  )
}
