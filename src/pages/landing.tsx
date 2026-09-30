import { Link } from "react-router"
import { ArrowRight, ChevronDown, Globe, KeyRound, Leaf, LifeBuoy, ShieldQuestion } from "lucide-react"

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
    <div className="relative flex min-h-svh flex-col overflow-hidden bg-brand-navy text-brand-navy-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(30,83,145,0.34),transparent_38%),linear-gradient(135deg,#031a38_0%,#08264d_52%,#031a38_100%)]" />
        <div className="absolute -right-24 bottom-[-13rem] size-[34rem] rounded-full border border-brand-gold/10" />
        <div className="absolute -left-32 top-[-16rem] size-[30rem] rounded-full border border-white/5" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-md sm:px-8 lg:px-12">
        <Rise>
          <OlivineLogo className="h-12 w-auto sm:h-14" />
        </Rise>
        <Rise delay={80} className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="border-slate-200 bg-white text-brand-navy shadow-sm hover:bg-slate-50" aria-label="Change language">
            <Globe /> English <ChevronDown />
          </Button>
          <Button variant="outline" size="sm" asChild className="border-slate-200 bg-white text-brand-navy shadow-sm hover:bg-slate-50">
            <a href="mailto:support@olivineglobalsystems.com">
              <LifeBuoy /> Help
            </a>
          </Button>
        </Rise>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-8 px-4 py-6 sm:px-8">
        <section className="text-center">
          <Rise>
            <p className="text-xs font-semibold tracking-[0.25em] text-brand-gold uppercase">
              Electrical Reliability Platform
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight font-semibold text-white sm:text-4xl">
              One Platform. One Data. <span className="text-brand-gold">One Command Centre.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/70">
              Real-time visibility, faster response and higher reliability across every enterprise, plant and electrical
              asset — for a safer, smarter tomorrow.
            </p>
          </Rise>
        </section>

        <section>
          <Rise delay={100}>
            <h2 className="mb-4 text-center text-sm font-semibold tracking-wider text-white/70 uppercase">
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
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-white/15 bg-white/8 px-5 py-3 backdrop-blur-sm">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-brand-gold">{stat.value}</span>
                <span className="text-xs tracking-wider text-white/60 uppercase">{stat.label}</span>
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
                className="inline-flex items-center gap-1.5 text-white/65 underline-offset-4 transition-colors hover:text-brand-gold hover:underline"
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
            <a
              href="mailto:support@olivineglobalsystems.com"
              className="inline-flex items-center gap-1.5 text-white/65 underline-offset-4 transition-colors hover:text-brand-gold hover:underline"
            >
              <LifeBuoy className="size-4" /> 24×7 helpdesk
              <ArrowRight className="size-3.5" />
            </a>
          </div>
        </Rise>
      </main>

      <footer className="relative z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/15 bg-brand-navy/80 px-4 py-3 text-xs text-white/65 backdrop-blur-sm sm:px-8">
        <span className="flex items-center gap-1.5 italic">
          <Leaf className="size-3.5 text-healthy" /> Reliable Today. Sustainable Tomorrow.
        </span>
        <span className="flex items-center gap-3">
          <a href="#" className="hover:text-white">Terms</a>|
          <a href="#" className="hover:text-white">Privacy</a>|
          <a href="mailto:support@olivineglobalsystems.com" className="hover:text-white">Support</a>
        </span>
        <span>© {new Date().getFullYear()} Olivine Global Systems</span>
      </footer>
    </div>
  )
}
