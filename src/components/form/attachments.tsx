import { FileText, Paperclip, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Attach one or more documents to a record - certificates, identity proof.
 * Holds the files on the form rather than uploading immediately, so nothing is
 * sent until the step is saved.
 */
export function Attachments({
  files,
  onChange,
  inputId,
  compact = false,
  accept = "application/pdf,image/png,image/jpeg",
}: {
  files: File[]
  onChange: (files: File[]) => void
  /** Unique per instance - two upload controls on one screen must not share a label */
  inputId: string
  /** Tighter layout, for use inside a table cell */
  compact?: boolean
  accept?: string
}) {
  const add = (picked: FileList | null) => {
    if (!picked?.length) return
    // Same file picked twice adds nothing
    const existing = new Set(files.map((f) => f.name + f.size))
    onChange([...files, ...Array.from(picked).filter((f) => !existing.has(f.name + f.size))])
  }

  return (
    <div className={cn("flex flex-col gap-1.5", compact && "gap-1")}>
      {files.length ? (
        <ul className={cn("flex flex-col gap-1", compact && "gap-0.5")}>
          {files.map((f) => (
            <li key={f.name + f.size} className="flex items-center gap-1.5 text-xs">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate" title={f.name}>{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((x) => x !== f))}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <Button type="button" variant="outline" size={compact ? "icon-sm" : "sm"} className="self-start text-primary" asChild>
        <label htmlFor={inputId} className="cursor-pointer">
          <Paperclip className={compact ? "size-3.5" : "size-3.5"} />
          {compact ? <span className="sr-only">Attach document</span> : <span>Attach document</span>}
          <input
            id={inputId}
            type="file"
            multiple
            accept={accept}
            className="sr-only"
            onChange={(e) => {
              add(e.target.files)
              // Clear, so picking the same file again still fires a change
              e.target.value = ""
            }}
          />
        </label>
      </Button>
      {!compact ? <p className="text-[0.7rem] text-muted-foreground">PDF, JPG or PNG. More than one file may be attached.</p> : null}
    </div>
  )
}
