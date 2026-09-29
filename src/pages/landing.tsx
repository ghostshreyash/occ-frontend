import { Link } from "react-router"
import { ArrowRight, KeyRound, Leaf, LifeBuoy, LogIn, ShieldQuestion } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Rise } from "@/components/auth/auth-screen"
import { OlivineLogo } from "@/components/layout/olivine-logo"
import { SystemCard } from "@/components/landing/system-card"
import { brandList } from "@/config/brands"
import { brandLoginHref, useBrand } from "@/lib/brand"
import { globalKpis } from "@/data/mock"

const format = (value: number) => value.toLocaleString("en-IN")

const stats = [
  { label: "Enterprises", value: format(globalKpis.enterprises.value) },
  { label: "Plants", value: format(globalKpis.plants.value) },
  { label: "Assets monitored", value: format(globalKpis.assets.value) },
  { label: "Countries", value: format(globalKpis.countries) },
  { label: "ELPREMARs", value: format(globalKpis.elpremars) },
]

const helpLinks = [
  { to: "/forgot-password", icon: KeyRound, label: "Forgot password?" },
  { to: "/account-recovery", icon: ShieldQuestion, label: "Can't sign in?" },
]

/**
 * Platform overview at `/welcome`.
 *
 * Signing in still happens on the host's own screen — this page is for someone
 * who is not sure which of the three systems they need, so each card sends them
 * to that system's sign-in. Built on the same light surface and motion as the
 * auth screens, and sized to fit one desktop viewport.
 */
export function LandingPage() {
  const current = useBrand()

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-primary/10 blur-3xl animate-drift" />
        <div className="absolute top-1/3 -right-40 size-[38rem] rounded-full bg-brand-gold/10 blur-3xl animate-drift-slow" />
        <div className="absolute -bottom-48 left-1/3 size-[30rem] rounded-full bg-healthy/8 blur-3xl animate-drift" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/70 dark:hidden" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Rise>
          <OlivineLogo className="h-10 w-auto" />
        </Rise>
        <Rise delay={80}>
          <Button variant="outline" size="sm" asChild className="bg-card/70 backdrop-blur-sm">
            <Link to="/login">
              <LogIn /> Log in
            </Link>
          </Button>
        </Rise>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 px-4 py-6 sm:px-8">
        <section className="text-center">
          <Rise>
            <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
              Electrical Reliability Platform
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight font-semibold text-brand-navy sm:text-4xl dark:text-foreground">
              One Platform. One Data. <span className="text-primary">One Command Centre.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Real-time visibility, faster response and higher reliability across every enterprise, plant and electrical
              asset — for a safer, smarter tomorrow.
            </p>
          </Rise>
        </section>

        <section>
          <Rise delay={100}>
            <h2 className="mb-4 text-center text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              Choose your system
            </h2>
          </Rise>
          <div className="grid gap-4 lg:grid-cols-3">
            {brandList.map((brand, i) => (
              <Rise key={brand.key} delay={160 + i * 90} className="flex">
                <SystemCard
                  brand={brand}
                  href={brandLoginHref(brand, current)}
                  current={brand.key === current.key}
                />
              </Rise>
            ))}
          </div>
        </section>

        <Rise delay={460}>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border bg-card/70 px-5 py-3 backdrop-blur-sm">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-primary">{stat.value}</span>
                <span className="text-xs tracking-wider text-muted-foreground uppercase">{stat.label}</span>
              </div>
            ))}
          </div>
        </Rise>

        <Rise delay={520}>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            {helpLinks.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
            <a
              href="mailto:support@olivineglobalsystems.com"
              className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              <LifeBuoy className="size-4" /> 24×7 helpdesk
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </Rise>
      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t bg-card/60 px-4 py-3 text-xs text-muted-foreground backdrop-blur-sm sm:px-8">
        <span className="flex items-center gap-1.5 italic">
          <Leaf className="size-3.5 text-healthy" /> Reliable Today. Sustainable Tomorrow.
        </span>
        <span className="flex items-center gap-3">
          <a href="#" className="hover:text-foreground">Terms</a>|
          <a href="#" className="hover:text-foreground">Privacy</a>|
          <a href="mailto:support@olivineglobalsystems.com" className="hover:text-foreground">Support</a>
        </span>
        <span>© {new Date().getFullYear()} Olivine Global Systems</span>
      </footer>
    </div>
  )
}
