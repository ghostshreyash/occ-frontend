import { Fragment } from "react"
import { Link } from "react-router"

type Crumb = { label: string; to?: string }

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        {breadcrumbs?.length ? (
          <nav className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[0.7rem] text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Home</Link>
            {breadcrumbs.map((c) => (
              <Fragment key={c.label}>
                <span>›</span>
                {c.to ? (
                  <Link to={c.to} className="hover:text-foreground">{c.label}</Link>
                ) : (
                  <span className="font-medium text-foreground">{c.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        ) : null}
        <h2 className="text-lg font-bold text-brand-navy dark:text-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}
