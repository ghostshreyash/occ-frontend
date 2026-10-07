import { Check, CircleDashed, Pencil, X } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

export type DetailRow = { label: string; value?: string; /** Span two columns for long text */ wide?: boolean }

/**
 * Read-only value grid. Filled values carry the weight; an optional section with
 * nothing in it says so plainly rather than rendering a wall of dashes.
 */
export function ValueGrid({ rows, columns = 4 }: { rows: DetailRow[]; columns?: 3 | 4 }) {
  const filled = rows.filter((r) => r.value && r.value.trim() !== "")
  if (filled.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <CircleDashed className="size-3.5" />
        Nothing entered — this section is optional.
      </p>
    )
  }
  return (
    <dl className={cn("grid gap-px overflow-hidden rounded-md bg-border sm:grid-cols-2", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {filled.map((r) => (
        <div key={r.label} className={cn("min-w-0 bg-card px-2.5 py-2", r.wide && "sm:col-span-2")}>
          {/* Label carries the weight, value sits lighter beneath it */}
          <dt className="text-[0.62rem] font-semibold tracking-wide text-foreground uppercase">{r.label}</dt>
          <dd className="mt-0.5 truncate text-xs text-muted-foreground" title={r.value}>
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * One reviewable/editable block. The header carries a step number, a one-line
 * summary so the section can be scanned without opening it, and a completion
 * chip. Only one section edits at a time, so half-finished edits can't be
 * scattered across the page.
 */
export function DetailSection({
  icon: Icon,
  title,
  step,
  summary,
  complete,
  optional,
  sectionKey,
  editing,
  onEditingChange,
  onSave,
  saveLabel = "Save",
  action,
  view,
  edit,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  /** Shown as a numbered badge, matching the wizard step it came from */
  step?: number
  /** One-line précis of the section's contents, e.g. "Tata Steel Limited · Large Cap" */
  summary?: string
  complete?: boolean
  /** Marks a section that may legitimately be left empty */
  optional?: boolean
  sectionKey: string
  editing: string | null
  onEditingChange: (k: string | null) => void
  onSave?: () => void
  /** Footer label; list editors save as they go, so they say "Done" */
  saveLabel?: string
  /** Extra header control, e.g. "Add Plant". Stands down while the section is being edited. */
  action?: React.ReactNode
  view: React.ReactNode
  edit?: React.ReactNode
}) {
  const isEditing = editing === sectionKey
  const locked = editing !== null && !isEditing

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg bg-card ring-1 transition-all duration-200",
        isEditing ? "ring-2 ring-primary/50" : "ring-foreground/10",
        locked && "opacity-60"
      )}
    >
      <header
        className={cn(
          "flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b px-3 py-2 transition-colors",
          isEditing ? "border-primary/20 bg-info-soft" : "border-transparent bg-muted/40"
        )}
      >
        {step !== undefined ? (
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded text-[0.6rem] font-bold tabular-nums",
              complete ? "bg-healthy text-healthy-foreground" : "bg-neutral text-neutral-foreground"
            )}
          >
            {complete ? <Check className="size-3" strokeWidth={3} /> : step}
          </span>
        ) : null}

        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="size-3.5 text-primary" />
          {title}
        </h4>

        {/* Summary lets you scan the section without reading the grid */}
        {summary && !isEditing ? (
          <span className="min-w-0 flex-1 truncate text-[0.7rem] text-muted-foreground" title={summary}>
            {summary}
          </span>
        ) : (
          <span className="flex-1" />
        )}

        {!isEditing && optional && !complete ? (
          <span className="rounded-full bg-neutral-soft px-1.5 py-0.5 text-[0.6rem] font-medium text-neutral-soft-foreground">
            Optional
          </span>
        ) : null}

        {!isEditing && action ? action : null}

        {edit ? (
          isEditing ? (
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[0.7rem]" onClick={() => onEditingChange(null)}>
                <X className="size-3" /> Cancel
              </Button>
              <Button type="button" size="sm" className="h-6 text-[0.7rem]" onClick={onSave}>
                <Check className="size-3" /> {saveLabel}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[0.7rem] text-primary hover:bg-primary/10"
              disabled={locked}
              onClick={() => onEditingChange(sectionKey)}
            >
              <Pencil className="size-3" /> Edit
            </Button>
          )
        ) : null}
      </header>

      <div className={cn("p-2.5", isEditing && "bg-info-soft/20")}>{isEditing ? edit : view}</div>
    </section>
  )
}
