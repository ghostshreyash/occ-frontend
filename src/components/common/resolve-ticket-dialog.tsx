import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { priorityTone, type TicketRow } from "@/data/occ-tables"
import { workStatus } from "@/lib/status"

/** The ticket being worked on; everything the dialog shows comes off the row */
export type ResolveTarget = TicketRow

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[0.62rem] font-semibold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="truncate">{children}</div>
    </div>
  )
}

/**
 * Read the ticket, write what was done about it, close it out.
 * Mount with a `key` per ticket so the resolution box resets between rows.
 */
export function ResolveTicketDialog({
  target,
  onOpenChange,
  onResolve,
}: {
  target: ResolveTarget | null
  onOpenChange: (open: boolean) => void
  onResolve: (resolution: string) => void
}) {
  const [resolution, setResolution] = useState(target?.resolution ?? "")
  // A closed ticket is on show only — its resolution is already on the record
  const settled = target?.status === "closed"
  // A ticket is closed with an account of what was done, never silently
  const ready = !settled && resolution.trim().length > 0

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-5 sm:max-w-2xl!">
        <DialogHeader>
          <DialogTitle>{settled ? "Ticket" : "Resolve Ticket"}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{target?.id}</span> · {target?.subject}
          </DialogDescription>
        </DialogHeader>

        {target && (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg p-3 text-xs ring-1 ring-foreground/10 sm:grid-cols-3">
              <Detail label="Enterprise">{target.enterprise}</Detail>
              <Detail label="Plant">{target.plant}</Detail>
              <Detail label="Category">{target.category}</Detail>
              <Detail label="Raised">
                <span className="tabular-nums">{target.raised}</span>
              </Detail>
              <Detail label="Assigned To">
                {target.elpremar ?? <span className="text-muted-foreground/60">Unassigned</span>}
              </Detail>
              <Detail label="Priority">
                <span className={cn("rounded px-1.5 py-0.5 text-[0.65rem] font-semibold", priorityTone[target.priority])}>
                  {target.priority}
                </span>
              </Detail>
              <Detail label="Status">
                <Badge variant={workStatus[target.status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">
                  {workStatus[target.status].label}
                </Badge>
              </Detail>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resolution" className="text-xs">Resolution</Label>
              <Textarea
                id="resolution"
                autoFocus={!settled}
                readOnly={settled}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder={settled ? "No resolution was recorded." : "What was done to resolve this ticket?"}
                className="min-h-32 text-xs"
              />
            </div>
          </>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button
            size="sm"
            disabled={!ready}
            title={settled ? "Ticket is already closed" : undefined}
            onClick={() => ready && onResolve(resolution.trim())}
          >
            <CheckCircle2 /> Close Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
