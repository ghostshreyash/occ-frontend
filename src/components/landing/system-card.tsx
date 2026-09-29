import { Link } from "react-router"
import { ArrowRight, Check } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import type { Brand } from "@/config/brands"

/**
 * One system on the overview. The card for the brand this host serves is marked
 * "you are here" and takes the solid action, since that is the sign-in this
 * deployment actually owns.
 */
export function SystemCard({ brand, href, current }: { brand: Brand; href: string; current: boolean }) {
  const { icon: Icon } = brand
  const external = href.startsWith("http")

  return (
    <div
      className={cn(
        "group flex flex-col rounded-2xl border bg-card/90 p-5 shadow-sm backdrop-blur-sm transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10",
        current && "border-primary/40 shadow-lg shadow-primary/10"
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
            current ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-brand-navy dark:text-foreground">
              {brand.wordmark.lead}
              {brand.wordmark.accent ? <span className="text-primary">{brand.wordmark.accent}</span> : null}
            </h3>
            {current ? (
              <span className="rounded-full bg-healthy-soft px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-healthy-soft-foreground uppercase">
                You are here
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{brand.audience}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">{brand.summary}</p>

      <ul className="mt-4 space-y-1.5 text-sm">
        {brand.features.map(({ label }) => (
          <li key={label} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-gold" />
            {label}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        <Button
          variant={current ? "default" : "outline"}
          asChild
          className="h-10 w-full rounded-full text-sm font-semibold"
        >
          {external ? (
            <a href={href}>
              Log in to {brand.wordmark.lead}
              {brand.wordmark.accent ?? ""} <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </a>
          ) : (
            <Link to={href}>
              Log in to {brand.wordmark.lead}
              {brand.wordmark.accent ?? ""} <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </Button>
      </div>
    </div>
  )
}
