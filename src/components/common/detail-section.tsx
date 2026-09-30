import { Ban, Check, Pencil, X } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

export type DetailRow = { label: string; value?: string }

/** Read-only value grid; sections with nothing filled in say so rather than showing blanks */
export function ValueGrid({ rows, columns = 4 }: { rows: DetailRow[]; columns?: 3 | 4 }) {
  const filled = rows.filter((r) => r.value && r.value.trim() !== "")
  if (filled.length === 0) {
    return <p className="text-xs text-muted-foreground">Not provided — this section is optional.</p>
  }
  return (
    <dl className={cn("grid gap-x-6 gap-y-2.5 sm:grid-cols-2", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
      {filled.map((r) => (
        <div key={r.label} className="min-w-0">
          <dt className="text-[0.65rem] text-muted-foreground">{r.label}</dt>
          <dd className="truncate text-xs font-medium" title={r.value}>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * One reviewable/editable block: heading, an Edit shortcut, and either the value
 * grid or the section's own form. Only one section edits at a time, so half-finished
 * edits can't be scattered across the page.
 */
export function DetailSection({
  icon: Icon,
  title,
  sectionKey,
  editing,
  onEditingChange,
  onSave,
  readOnlyNote,
  view,
  edit,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  sectionKey: string
  editing: string | null
  onEditingChange: (k: string | null) => void
  onSave?: () => void
  /** Shown instead of an Edit button when a section cannot be changed here */
  readOnlyNote?: string
  view: React.ReactNode
  edit?: React.ReactNode
}) {
  const isEditing = editing === sectionKey
  const locked = editing !== null && !isEditing

  return (
    <section className={cn("rounded-lg ring-1 transition-colors", isEditing ? "ring-primary/40" : "ring-foreground/10")}>
      <header
        className={cn(
          "flex items-center justify-between gap-2 rounded-t-lg px-3 py-1.5",
          isEditing ? "bg-info-soft" : "bg-muted/60"
        )}
      >
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="size-3.5 text-primary" />
          {title}
        </h4>

        {readOnlyNote ? (
          <span className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
            <Ban className="size-3" /> {readOnlyNote}
          </span>
        ) : edit ? (
          isEditing ? (
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-6 text-[0.7rem]" onClick={() => onEditingChange(null)}>
                <X className="size-3" /> Cancel
              </Button>
              <Button type="button" size="sm" className="h-6 text-[0.7rem]" onClick={onSave}>
                <Check className="size-3" /> Save
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[0.7rem]"
              disabled={locked}
              onClick={() => onEditingChange(sectionKey)}
            >
              <Pencil className="size-3" /> Edit
            </Button>
          )
        ) : null}
      </header>

      <div className="p-3">{isEditing ? edit : view}</div>
    </section>
  )
}
