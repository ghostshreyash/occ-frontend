import { Link } from "react-router"
import { ArrowRight, Ban } from "lucide-react"
import { cn } from "cn"

/**
 * White panel with a title row and optional "View All →" link, as used throughout the mockups.
 *
 * `disabled` renders the panel as unavailable: a "Disabled" chip in the header, muted and
 * desaturated content, and no pointer interaction. The panel still shows its data so the
 * layout reads correctly, it just signals that the module is not live yet.
 */
export function SectionCard({
  title,
  icon,
  viewAllTo,
  actions,
  disabled = false,
  disabledLabel = "Disabled",
  hoverable = true,
  className,
  contentClassName,
  children,
}: {
  title: React.ReactNode
  icon?: React.ReactNode
  viewAllTo?: string
  actions?: React.ReactNode
  disabled?: boolean
  disabledLabel?: string
  /** Set false for large table panels, where a lift on hover is distracting */
  hoverable?: boolean
  className?: string
  contentClassName?: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-disabled={disabled || undefined}
      className={cn(
        "group/card flex flex-col rounded-lg bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10",
        "transition-[transform,box-shadow,--tw-ring-color] duration-200 ease-out",
        // Live panels lift on hover; disabled ones stay put so they read as inert
        disabled
          ? "bg-muted/40 ring-foreground/5"
          : hoverable && "hover:shadow-md hover:ring-foreground/20 motion-safe:hover:-translate-y-0.5",
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-2">
        <h3 className={cn("flex min-w-0 items-center gap-1.5 text-sm font-semibold", disabled && "text-muted-foreground")}>
          {icon}
          <span className="truncate">{title}</span>
        </h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {disabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-soft px-1.5 py-0.5 text-[0.62rem] font-semibold tracking-wide text-neutral-soft-foreground uppercase ring-1 ring-foreground/10">
              <Ban className="size-2.5" />
              {disabledLabel}
            </span>
          ) : (
            <>
              {actions}
              {viewAllTo ? (
                <Link
                  to={viewAllTo}
                  className="group/link flex items-center gap-1 text-[0.7rem] font-medium whitespace-nowrap text-primary hover:underline"
                >
                  View All
                  <ArrowRight className="size-3 transition-transform duration-200 ease-out motion-safe:group-hover/link:translate-x-0.5 motion-safe:group-hover/card:translate-x-0.5" />
                </Link>
              ) : null}
            </>
          )}
        </div>
      </header>
      <div
        className={cn(
          "flex-1 px-3 pb-3",
          disabled && "pointer-events-none opacity-45 grayscale select-none",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  )
}
