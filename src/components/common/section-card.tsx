import { Link } from "react-router"
import { ArrowRight } from "lucide-react"
import { cn } from "cn"

/** White panel with a title row and optional "View All →" link, as used throughout the mockups */
export function SectionCard({
  title,
  icon,
  viewAllTo,
  actions,
  className,
  contentClassName,
  children,
}: {
  title: React.ReactNode
  icon?: React.ReactNode
  viewAllTo?: string
  actions?: React.ReactNode
  className?: string
  contentClassName?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("flex flex-col rounded-xl bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10", className)}>
      <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h3 className="flex items-center gap-2 font-semibold">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {actions}
          {viewAllTo ? (
            <Link to={viewAllTo} className="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-primary hover:underline">
              View All <ArrowRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </header>
      <div className={cn("flex-1 px-4 pb-4", contentClassName)}>{children}</div>
    </section>
  )
}
