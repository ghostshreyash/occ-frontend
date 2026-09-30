import { motion } from "framer-motion"
import { cn } from "cn"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type Column<T> = {
  key: string
  label: string
  /** Hide below this breakpoint to keep narrow screens readable */
  hideBelow?: "sm" | "md" | "lg"
  align?: "right"
  render: (row: T) => React.ReactNode
}

const th = "h-8 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"
const hide = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" }

/**
 * A table whose rows act as a picker. The selected row is marked with a primary
 * edge and tint, and drives whatever is shown beneath it.
 */
export function SelectableTable<T extends { id: string }>({
  rows,
  columns,
  selectedId,
  onSelect,
  empty = "Nothing to show",
}: {
  rows: T[]
  columns: Column<T>[]
  selectedId?: string
  onSelect: (id: string) => void
  empty?: string
}) {
  if (rows.length === 0) {
    return <p className="px-1 py-4 text-center text-xs text-muted-foreground">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((c) => (
              <TableHead key={c.key} className={cn(th, c.hideBelow && hide[c.hideBelow], c.align === "right" && "text-right")}>
                {c.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const selected = row.id === selectedId
            return (
              <TableRow
                key={row.id}
                onClick={() => onSelect(row.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onSelect(row.id)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={selected}
                data-state={selected ? "selected" : undefined}
                className={cn("relative cursor-pointer", selected && "bg-info-soft hover:bg-info-soft")}
              >
                {columns.map((c, i) => (
                  <TableCell
                    key={c.key}
                    className={cn(td, c.hideBelow && hide[c.hideBelow], c.align === "right" && "text-right", i === 0 && "relative pl-3")}
                  >
                    {/* Edge marker travels between rows as the selection moves */}
                    {i === 0 && selected ? (
                      <motion.span
                        layoutId="row-marker"
                        className="absolute inset-y-0 left-0 w-0.5 bg-primary"
                        transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      />
                    ) : null}
                    {c.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
