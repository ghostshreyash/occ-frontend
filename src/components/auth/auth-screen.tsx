import { Link } from "react-router"
import { ChevronDown, Globe, LifeBuoy } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { OlivineLogo } from "@/components/layout/olivine-logo"
import type { Brand } from "@/config/brands"

/** Staggered entrance, so the screen assembles rather than appearing at once. */
export function Rise({
  delay = 0,
  className,
  children,
}: {
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("animate-rise", className)} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/**
 * The frame every sign-in screen shares: a light page with slow-drifting brand
 * light behind it, the Olivine bar on top, the story panel on the left and the
 * card on the right, and the role's promises along the foot.
 *
 * Login, verification, password reset and the request forms all render inside
 * it, so moving between them changes the card and nothing else.
 */
export function AuthScreen({
  brand,
  story,
  children,
}: {
  brand: Brand
  /** Left-hand panel; omitted on the short forms, which centre the card. */
  story?: React.ReactNode
  children: React.ReactNode
}) {
  const immersive = Boolean(story)
  const photo = brand.visual.kind === "photo"
  const photoSrc = brand.visual.kind === "photo" ? brand.visual.src : null

  return (
    <div
      data-brand={brand.key}
      className={cn(
        "group relative flex min-h-svh flex-col overflow-hidden",
        immersive ? "bg-brand-navy text-brand-navy-foreground" : "bg-background"
      )}
    >
      {/* Ambient brand light */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {immersive && photo ? (
          <>
            <img
              src={photoSrc ?? ""}
              alt=""
              className="absolute inset-0 size-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-brand-navy/85 via-brand-navy/25 via-45% to-brand-navy/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/65 via-transparent to-brand-navy/10" />
            <div className="absolute inset-y-0 left-0 w-[55%] bg-[#062957]/90 [clip-path:polygon(0_18%,100%_31%,78%_100%,0_100%)]" />
            <div className="absolute inset-y-0 left-0 w-[42%] bg-[#0b3768]/55 [clip-path:polygon(0_0,100%_11%,100%_30%,0_18%)]" />
          </>
        ) : immersive ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(28,78,135,0.28),transparent_36%),linear-gradient(135deg,#031a38_0%,#08264d_52%,#031a38_100%)]" />
            <div className="absolute -right-20 bottom-[-12rem] size-[32rem] rounded-full border border-brand-gold/10" />
            <div className="absolute -left-32 top-[-15rem] size-[28rem] rounded-full border border-white/5" />
          </>
        ) : (
          <>
            <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-primary/10 blur-3xl animate-drift" />
            <div className="absolute top-1/3 -right-40 size-[38rem] rounded-full bg-brand-gold/10 blur-3xl animate-drift-slow" />
            <div className="absolute -bottom-48 left-1/3 size-[30rem] rounded-full bg-healthy/8 blur-3xl animate-drift" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/70 dark:hidden" />
          </>
        )}
      </div>

      <header
        className={cn(
          "relative flex items-center justify-between gap-3 px-4 py-4 sm:px-8",
          immersive && "bg-white/90 shadow-sm backdrop-blur-md lg:px-12",
          brand.key === "evita" && "py-3 sm:py-4"
        )}
      >
        <Rise>
          <Link to="/welcome" aria-label="Olivine Global Systems" className="inline-block">
            <OlivineLogo className={brand.key === "evita" ? "h-12 w-auto sm:h-16" : "h-10 w-auto"} />
          </Link>
        </Rise>
        <Rise delay={80} className="flex items-center gap-2">
          <Button
            variant={immersive ? "outline" : "ghost"}
            size="sm"
            className={cn(
              "max-sm:hidden",
              immersive ? "border-slate-200 bg-white text-brand-navy hover:bg-slate-50" : "text-muted-foreground"
            )}
            aria-label="Change language"
          >
            <Globe /> English <ChevronDown />
          </Button>
          {brand.key !== "evita" ? (
            <Button
              variant="outline"
              size="sm"
              asChild
              className={cn(
                "backdrop-blur-sm",
                immersive ? "border-slate-200 bg-white text-brand-navy hover:bg-slate-50" : "bg-card/70"
              )}
            >
              <a href="#support">
                <LifeBuoy /> Help
              </a>
            </Button>
          ) : null}
        </Rise>
      </header>

      <main
        className={cn(
          "relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-4 pb-8 sm:px-8",
          story && "lg:grid-cols-[minmax(0,1fr)_minmax(0,31rem)] lg:gap-16 lg:px-12"
        )}
      >
        {story ? <div className="min-w-0 max-lg:hidden">{story}</div> : null}
        <div className={cn("w-full", story ? "lg:justify-self-end" : "mx-auto max-w-md")}>{children}</div>
      </main>

      <footer
        id="support"
        className={cn(
          "relative z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t px-4 py-3 text-xs backdrop-blur-sm sm:px-8",
          brand.key === "evita"
            ? "hidden"
            : immersive
            ? "border-white/15 bg-brand-navy/80 text-brand-navy-foreground/80"
            : "bg-card/60 text-muted-foreground"
        )}
      >
        {brand.promises.map(({ icon: Icon, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <Icon className="size-3.5 text-brand-gold" />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-3 max-sm:w-full max-sm:justify-center">
          <a href="#" className="hover:text-foreground">Terms</a>|
          <a href="#" className="hover:text-foreground">Privacy</a>|
          <a href="mailto:support@olivineglobalsystems.com" className="hover:text-foreground">
            support@olivineglobalsystems.com
          </a>
        </span>
        <span>© {new Date().getFullYear()} Olivine Global Systems</span>
      </footer>
    </div>
  )
}

/**
 * The card itself. Every auth step uses it, so the box stays put while its
 * contents change — the verification step feels like the next page of the same
 * form rather than a different screen.
 */
export function AuthCard({
  brand,
  title,
  description,
  badge,
  above,
  children,
  footer,
  delay = 120,
}: {
  brand?: Brand
  title: string
  description?: string
  /** Small pill over the title, e.g. the step. */
  badge?: React.ReactNode
  /** Between the header and the form, e.g. the step dots. */
  above?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  delay?: number
}) {
  const evita = brand?.key === "evita"

  return (
    <Rise delay={delay}>
      <section className={cn(
        "rounded-2xl border bg-card/95 p-6 text-card-foreground shadow-xl shadow-primary/5 backdrop-blur-sm sm:p-8",
        evita && "border-white/70 bg-white/95 shadow-[0_18px_55px_rgba(5,35,75,0.24)] lg:p-9"
      )}>
        {evita ? (
          <div className="mb-6 text-center">
            <div className="bg-gradient-to-r from-[#164d9b] via-[#0b3b80] to-[#68a83c] bg-clip-text text-[3.3rem] font-black leading-none tracking-[-0.06em] text-transparent">
              EVITA<sup className="ml-1 align-super text-sm font-bold text-[#164d9b]">™</sup>
            </div>
            <p className="mt-2 text-xs font-medium leading-tight text-[#163b72]">
              Enterprise Electrical Maintenance
              <br />&amp; Reliability Management System
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#b8cadf]" />
              <span className="whitespace-nowrap text-sm italic text-[#31578e]">Field Insights. Reliable Assets.</span>
              <span className="h-px flex-1 bg-[#b8cadf]" />
            </div>
          </div>
        ) : null}
        {badge ? <div className="mb-3">{badge}</div> : null}
        <h1 className={cn("font-bold tracking-tight text-brand-navy dark:text-foreground", evita ? "text-[1.8rem]" : "text-2xl")}>{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-muted-foreground">{description}</p> : null}
        {above ? <div className="mt-5">{above}</div> : null}
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 border-t pt-5">{footer}</div> : null}
      </section>
    </Rise>
  )
}

/** Small capsule used for the step indicator above a card title. */
export function AuthBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  )
}

/** Error / notice panel, in the light palette the screens now share. */
export function AuthNotice({
  variant = "error",
  icon,
  children,
}: {
  variant?: "error" | "warning" | "info"
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      role="alert"
      className={cn(
        "mb-4 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm animate-in fade-in slide-in-from-top-1",
        variant === "error" && "border-critical/30 bg-critical-soft text-critical-soft-foreground",
        variant === "warning" && "border-attention/40 bg-attention-soft text-attention-soft-foreground",
        variant === "info" && "border-info/25 bg-info-soft text-info-soft-foreground"
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <span className="min-w-0">{children}</span>
    </div>
  )
}

/** Primary action, with a sheen that sweeps across on hover. */
export function AuthSubmit({
  busy,
  disabled,
  children,
  className,
}: {
  busy?: boolean
  disabled?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={busy || disabled}
      className={cn("group/submit relative h-11 w-full overflow-hidden text-base font-semibold", className)}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 opacity-0 group-hover/submit:opacity-100 group-hover/submit:animate-sheen"
      />
      {children}
    </Button>
  )
}
