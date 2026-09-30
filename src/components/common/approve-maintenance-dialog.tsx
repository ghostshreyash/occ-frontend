import { useState } from "react"
import { CheckCheck, Undo2 } from "lucide-react"
import { cn } from "cn"

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
import { control } from "@/lib/data-table"

/** The activity being reviewed, and enough of it to confirm you have the right one */
export type ApprovalTarget = {
  id: string
  title: string
  subtitle: string
  performedBy?: string
  window?: string
  evidenceCount: number
}

/**
 * The OCC sign-off, in the same modal shape as the scheduling dialog: read what
 * was executed, leave a remark, then approve it or send it back for correction.
 */
export function ApproveMaintenanceDialog({
  target,
  onOpenChange,
  onReview,
}: {
  target: ApprovalTarget | null
  onOpenChange: (open: boolean) => void
  onReview: (outcome: "approved" | "rejected", remarks: string) => void
}) {
  const [remarks, setRemarks] = useState("")
  // Approving without a word is fine; sending work back has to say why
  const canReject = remarks.trim().length > 0

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-5 sm:max-w-lg!">
        <DialogHeader>
          <DialogTitle>Review Maintenance</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{target?.title}</span> · {target?.subtitle}
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 rounded-lg p-3 text-xs ring-1 ring-foreground/10">
            <div>
              <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Task ID</div>
              <div className="mt-0.5 font-medium tabular-nums">{target.id}</div>
            </div>
            <div className="min-w-0">
              <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Performed by</div>
              <div className="mt-0.5 truncate">{target.performedBy ?? "—"}</div>
            </div>
            <div>
              <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Evidence</div>
              <div className="mt-0.5">{target.evidenceCount} item{target.evidenceCount === 1 ? "" : "s"}</div>
            </div>
            <div className="col-span-3">
              <div className="text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">Work window</div>
              <div className="mt-0.5 tabular-nums">{target.window ?? "Not recorded"}</div>
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="approval-remarks" className="text-xs">Approval remarks</Label>
          <Textarea
            id="approval-remarks"
            autoFocus
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional when approving; required when requesting a correction."
            className="min-h-24 text-xs"
          />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" className={control}>Cancel</Button>
          </DialogClose>
          <Button
            variant="secondary"
            size="sm"
            className={cn(control, "text-critical")}
            disabled={!canReject}
            title={canReject ? undefined : "Say what needs correcting first"}
            onClick={() => onReview("rejected", remarks.trim())}
          >
            <Undo2 className="size-3.5" /> Request Correction
          </Button>
          <Button size="sm" className={control} onClick={() => onReview("approved", remarks.trim())}>
            <CheckCheck className="size-3.5" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
