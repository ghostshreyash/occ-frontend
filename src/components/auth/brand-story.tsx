import { cn } from "cn"

import { Rise } from "@/components/auth/auth-screen"
import type { Brand } from "@/config/brands"

/**
 * The panel beside the form: who this sign-in is for and what waits behind it.
 *
 * EMMS-E and EVITA show their field photography; the Command Centre shows a
 * live console motif instead, because that is what it actually looks like.
 */
export function BrandStory({ brand }: { brand: Brand }) {
  const immersive = brand.visual.kind === "photo" || brand.key === "occ"
  const evita = brand.key === "evita"

  return (
    <div className="max-w-xl">
      <Rise className={evita ? "hidden" : undefined}>
        <p className={cn("text-xs font-semibold tracking-[0.2em] uppercase", immersive ? "text-white/75" : "text-primary")}>
          {brand.eyebrow}
        </p>
      </Rise>

      <Rise delay={60}>
        <h2 className={cn("mt-3 text-5xl font-black tracking-tight", immersive ? "text-white" : "text-brand-navy dark:text-foreground")}>
          {brand.wordmark.lead}
          {brand.wordmark.accent ? <span className={immersive ? "text-sky-300" : "text-primary"}>{brand.wordmark.accent}</span> : null}
          <sup className={cn("ml-1 align-super text-base font-semibold", immersive ? "text-white/60" : "text-muted-foreground")}>™</sup>
        </h2>
        <p className={cn("mt-2 max-w-md text-sm", immersive ? "text-white/80" : "text-muted-foreground")}>
          {evita ? "Electrical Asset Management for a Safer Tomorrow" : brand.system}
        </p>
        {!evita ? (
          <p className={cn("mt-4 w-fit border-b-2 border-brand-gold pb-1 font-serif text-lg italic", immersive ? "text-white" : "text-brand-navy dark:text-foreground")}>
            {brand.tagline}
          </p>
        ) : null}
      </Rise>

      <ul className="mt-7 space-y-3">
        {brand.features.map(({ icon: Icon, label, detail }, i) => (
          <li key={label}>
            <Rise delay={140 + i * 80}>
              <div className="flex items-start gap-3">
                <span className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm",
                  immersive ? "bg-white/12 text-white ring-1 ring-white/20" : "bg-card text-primary ring-1 ring-border"
                )}>
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={cn("block text-sm font-semibold", immersive ? "text-white" : "text-brand-navy dark:text-foreground")}>{label}</span>
                  <span className={cn("block text-sm", immersive ? "text-white/70" : "text-muted-foreground")}>{detail}</span>
                </span>
              </div>
            </Rise>
          </li>
        ))}
      </ul>

      <Rise delay={420} className="mt-8">
        {brand.visual.kind === "photo" ? <PhotoCaption brand={brand} /> : <OccInfoPanel />}
      </Rise>
    </div>
  )
}

function PhotoCaption({ brand }: { brand: Brand }) {
  return (
    <div className="max-w-sm border-t border-white/30 pt-4 text-sm text-white/85">
      <span className="block font-semibold text-white">{brand.audience}</span>
      <span className="mt-1 block">Built for safer decisions, stronger assets and more reliable operations.</span>
    </div>
  )
}

function OccInfoPanel() {
  return (
    <div className="max-w-md border-t border-white/20 pt-5 text-white/80">
      <p className="text-sm leading-relaxed">
        The Olivine Command Centre gives operations teams one trusted view of enterprise, plant and asset reliability.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Global visibility", "Every asset in one place"],
          ["Critical response", "Alerts and escalations"],
          ["Reliable decisions", "Live operational context"],
        ].map(([title, detail]) => (
          <div key={title} className="border-l border-brand-gold/60 pl-3">
            <span className="block text-xs font-semibold text-white">{title}</span>
            <span className="mt-1 block text-xs text-white/60">{detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
