import { Loader2, RefreshCw, TriangleAlert } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

/**
 * What a screen shows while it is reading the API, and when the read failed.
 *
 * Both states are small and in-place rather than taking over the page: a
 * register that is reloading keeps its KPIs and its rows, with a strip above
 * the table saying so. The alternative — swapping the whole panel for a
 * spinner — loses the operator's place on every filter change.
 */

/** A strip above a table while a read is in flight. Nothing when it is not. */
export function LoadingBar({ loading, label = "Loading…" }: { loading: boolean; label?: string }) {
  if (!loading) return null
  return (
    <div
      role="status"
      className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-1.5 text-[0.7rem] text-muted-foreground"
    >
      <Loader2 className="size-3 animate-spin" />
      {label}
    </div>
  )
}

/**
 * A failed read, with the reason and a way to try again.
 *
 * The message comes from `messageFor` in the API layer, so "could not reach the
 * API" and a 403 read differently — the operator can tell a backend that is
 * down from a record they are not allowed to see.
 */
export function ErrorNotice({
  error,
  onRetry,
  className,
}: {
  error: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md bg-critical-soft px-3 py-2 text-xs text-critical-soft-foreground ring-1 ring-critical/20",
        className,
      )}
    >
      <TriangleAlert className="size-3.5 shrink-0 text-critical" />
      <span className="min-w-0 flex-1">{error}</span>
      {onRetry ? (
        <Button variant="outline" size="sm" className="h-6 bg-card text-[0.7rem]" onClick={onRetry}>
          <RefreshCw className="size-3" /> Try again
        </Button>
      ) : null}
    </div>
  )
}
