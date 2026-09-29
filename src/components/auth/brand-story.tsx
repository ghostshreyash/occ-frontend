import { Leaf } from "lucide-react"
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
  if (brand.medallions) return <SceneStory brand={brand} />
  return <DefaultStory brand={brand} />
}

/**
 * Brands whose artwork puts the story on a photographic scene: the wordmark and
 * its edition rule, the benefit medallions, the caption and the promise bar,
 * all standing on the background rather than in a panel of their own.
 */
function SceneStory({ brand }: { brand: Brand }) {
  return (
    <div className="max-w-2xl text-center text-brand-navy">
      <Rise>
        <h2 className="text-5xl font-black tracking-tight sm:text-6xl">
          {brand.wordmark.lead}
          {brand.wordmark.accent ? <span className="text-primary">{brand.wordmark.accent}</span> : null}
          <sup className="ml-1 align-super text-base font-bold">™</sup>
        </h2>
        <p className="mt-2 text-xl font-bold leading-tight">Electrical Maintenance Management System</p>
        <p className="mx-auto mt-1 w-fit border-b-2 border-brand-gold pb-1 text-xl font-bold">Enterprise Edition</p>
        <p className="mt-3 text-lg font-medium text-brand-navy/80">{brand.tagline}</p>
      </Rise>

      <ul className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {brand.medallions?.map(({ icon: Icon, lines, tone }, i) => (
          <li key={lines.join(" ")}>
            <Rise delay={140 + i * 80}>
              <div className="flex flex-col items-center gap-2 px-1">
                <span className="group/med relative flex size-14 items-center justify-center">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-full opacity-45 blur-md transition-opacity duration-300 group-hover/med:opacity-80",
                      tone.replace("text-", "bg-")
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-white to-slate-100",
                      "shadow-[0_8px_20px_rgba(11,31,68,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-white/70",
                      "transition-transform duration-300 group-hover/med:-translate-y-1 group-hover/med:scale-105",
                      tone
                    )}
                  >
                    <Icon className="size-7" strokeWidth={2.2} />
                  </span>
                </span>
                <span className="text-sm leading-tight font-bold">
                  {lines[0]}
                  <br />
                  {lines[1]}
                </span>
              </div>
            </Rise>
          </li>
        ))}
      </ul>

      {brand.caption ? (
        <Rise delay={460}>
          <p className="mt-8 ml-auto flex w-fit items-start gap-2 rounded-r-lg border-l-[3px] border-brand-gold bg-white/70 py-2 pr-3 pl-3 text-left text-base leading-snug font-semibold backdrop-blur-[2px]">
            <span>
              Powering Reliable Operations
              <br />
              for a Greener Tomorrow.
            </span>
            <Leaf className="mt-0.5 size-5 shrink-0 text-healthy" />
          </p>
        </Rise>
      ) : null}

      <Rise delay={520}>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 rounded-xl bg-brand-navy/92 px-5 py-3 text-brand-navy-foreground shadow-xl ring-1 ring-white/10 backdrop-blur-sm">
          {brand.promises.map(({ icon: Icon, label }, i) => (
            <li
              key={label}
              className={cn("flex items-center gap-2 pl-0", i > 0 && "border-l border-white/20 pl-5")}
            >
              <Icon className="size-5 shrink-0 text-brand-gold" />
              <span className="text-xs leading-tight font-semibold">
                {label.split(" ")[0]}
                <br />
                {label.split(" ").slice(1).join(" ")}
              </span>
            </li>
          ))}
        </ul>
      </Rise>
    </div>
  )
}

function DefaultStory({ brand }: { brand: Brand }) {
  const evita = brand.key === "evita"
  const occ = brand.key === "occ"
  const emmse = brand.key === "emmse"
  const darkStory = evita || occ

  return (
    <div className={cn("max-w-xl", emmse && "text-center")}> 
      <Rise className={evita || occ ? "hidden" : undefined}>
        <p className={cn("text-xs font-semibold tracking-[0.2em] uppercase", darkStory ? "text-white/75" : "text-brand-navy/70")}>
          {brand.eyebrow}
        </p>
      </Rise>

      <Rise delay={60}>
        <h2 className={cn("mt-3 text-5xl font-black tracking-tight", darkStory ? "text-white" : "text-brand-navy")}>
          {occ ? "Log in to Olivine Command Centre" : brand.wordmark.lead}
          {!occ && brand.wordmark.accent ? <span className={darkStory ? "text-sky-300" : "text-primary"}>{brand.wordmark.accent}</span> : null}
          {!occ ? <sup className={cn("ml-1 align-super text-base font-semibold", darkStory ? "text-white/60" : "text-muted-foreground")}>™</sup> : null}
        </h2>
        <p className={cn("mt-2 max-w-md text-sm", darkStory ? "text-white/80" : "text-brand-navy/70")}>
          {evita ? "Electrical Asset Management for a Safer Tomorrow" : brand.system}
        </p>
        {!evita && !occ ? (
          <p className={cn("mt-4 w-fit border-b-2 border-brand-gold pb-1 font-serif text-lg italic", darkStory ? "text-white" : "text-brand-navy")}>
            {brand.tagline}
          </p>
        ) : null}
      </Rise>

      {!occ ? <ul className={cn("mt-7 space-y-3", emmse && "grid grid-cols-4 gap-3 space-y-0")}>
        {brand.features.map(({ icon: Icon, label, detail }, i) => (
          <li key={label}>
            <Rise delay={140 + i * 80}>
              <div className={cn("flex items-start gap-3", emmse && "flex-col items-center gap-2 border-r border-brand-navy/20 px-2 text-center last:border-r-0")}>
                <span className="group/feat relative flex shrink-0 items-center justify-center">
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-xl blur-md transition-opacity duration-300",
                      darkStory ? "bg-sky-400/35 opacity-60 group-hover/feat:opacity-100" : "bg-primary/25 opacity-50 group-hover/feat:opacity-90"
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex size-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover/feat:-translate-y-0.5 group-hover/feat:scale-105",
                      darkStory
                        ? "bg-gradient-to-br from-white/25 to-white/5 text-white ring-1 ring-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                        : "bg-gradient-to-br from-white to-slate-100 text-primary ring-1 ring-white/70 shadow-[0_6px_16px_rgba(11,31,68,0.15)]"
                    )}
                  >
                    <Icon className="size-5" strokeWidth={2.2} />
                  </span>
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={cn("block text-sm font-semibold", darkStory ? "text-white" : "text-brand-navy")}>{label}</span>
                  <span className={cn("block text-sm", emmse ? "text-xs text-brand-navy/65" : darkStory ? "text-white/70" : "text-brand-navy/65")}>{detail}</span>
                </span>
              </div>
            </Rise>
          </li>
        ))}
      </ul> : null}

      {!occ ? (
        <Rise delay={420} className="mt-8">
          {brand.visual.kind === "photo" ? <PhotoCaption brand={brand} /> : null}
        </Rise>
      ) : null}
      {brand.key === "emmse" ? <EmmseWorkflowRail brand={brand} /> : null}
    </div>
  )
}

function PhotoCaption({ brand }: { brand: Brand }) {
  const dark = brand.key === "evita"
  if (dark) {
    return (
      <div className="max-w-sm border-t border-white/30 pt-4">
        <p className="flex items-start gap-2.5 text-sm text-white/90">
          <Leaf className="mt-0.5 size-5 shrink-0 text-healthy" />
          <span>
            People. Technology. Reliability.
            <br />A Greener Future.
          </span>
        </p>
      </div>
    )
  }
  return (
    <div className="max-w-sm border-t border-brand-navy/25 pt-4 text-sm text-brand-navy/70">
      <span className="block font-semibold text-brand-navy">{brand.audience}</span>
      <span className="mt-1 block">Built for safer decisions, stronger assets and more reliable operations.</span>
    </div>
  )
}

function EmmseWorkflowRail({ brand }: { brand: Brand }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl bg-brand-navy/88 p-3 text-white shadow-xl ring-1 ring-white/15 backdrop-blur-md">
      {brand.promises.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 border-l border-brand-gold/70 pl-2 text-xs">
          <Icon className="size-4 shrink-0 text-brand-gold" />
          <span className="leading-tight">{label}</span>
        </div>
      ))}
    </div>
  )
}
