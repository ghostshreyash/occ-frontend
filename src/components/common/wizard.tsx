import { Check, Lightbulb, type LucideIcon } from "lucide-react"
import { cn } from "cn"

import { Progress } from "@/components/ui/progress"

export type WizardStep = {
  title: string
  description: string
  icon: LucideIcon
  /** Filled in once the step is done, e.g. "Tata Steel Limited" */
  summary?: string
}

function StepCircle({ index, state }: { index: number; state: "done" | "current" | "upcoming" }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
        state === "done" && "bg-healthy text-healthy-foreground",
        state === "current" && "bg-primary text-primary-foreground ring-4 ring-primary/15",
        state === "upcoming" && "bg-neutral text-neutral-foreground"
      )}
    >
      {state === "done" ? <Check className="size-4" strokeWidth={3} /> : index + 1}
    </span>
  )
}

const stateOf = (i: number, current: number) => (i < current ? "done" : i === current ? "current" : "upcoming")

/** Horizontal step indicator across the top of an onboarding flow */
export function StepperBar({ steps, current }: { steps: WizardStep[]; current: number }) {
  return (
    <ol className="mb-5 flex items-center gap-2 overflow-x-auto rounded-xl bg-card px-5 py-4 shadow-xs ring-1 ring-foreground/10">
      {steps.map((step, i) => (
        <li key={step.title} className="flex min-w-fit flex-1 items-center gap-2 last:flex-none">
          <StepCircle index={i} state={stateOf(i, current)} />
          <span className={cn("text-sm whitespace-nowrap", i === current ? "font-semibold text-primary" : "text-foreground")}>
            {step.title}
          </span>
          {i < steps.length - 1 ? (
            <span className={cn("mx-2 h-px min-w-6 flex-1", i < current ? "bg-healthy" : "bg-border")} />
          ) : null}
        </li>
      ))}
    </ol>
  )
}

/** Right-hand "Onboarding Progress" panel with vertical steps */
export function WizardProgressPanel({ steps, current }: { steps: WizardStep[]; current: number }) {
  const percent = Math.round(((current + 1) / steps.length) * 100)
  return (
    <div className="rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Onboarding Progress</h3>
        <span className="text-sm font-medium text-primary">
          Step {current + 1} of {steps.length}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Progress value={percent} className="h-2 [&>[data-slot=progress-indicator]]:bg-healthy" />
        <span className="text-sm font-semibold">{percent}%</span>
      </div>

      <div className="mt-4 rounded-lg bg-info-soft/60 p-3">
        <h4 className="mb-3 text-sm font-semibold">Onboarding Steps</h4>
        <ol className="space-y-1">
          {steps.map((step, i) => {
            const state = stateOf(i, current)
            return (
              <li
                key={step.title}
                className={cn("flex items-start gap-3 rounded-lg p-2", state === "current" && "bg-card shadow-xs")}
              >
                <step.icon className="mt-1.5 size-5 shrink-0 text-brand-navy dark:text-foreground" />
                <StepCircle index={i} state={state} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-sm font-semibold">
                    {step.title}
                    {state === "done" ? <Check className="size-3.5 text-healthy" /> : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {state === "done" && step.summary ? step.summary : step.description}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

/** Green "Key Information" tips box */
export function KeyInfo({ title = "Key Information", items }: { title?: string; items: string[] }) {
  return (
    <div className="rounded-xl bg-healthy-soft p-4 ring-1 ring-healthy/20">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Lightbulb className="size-5 text-healthy" /> {title}
      </h4>
      <ul className="ml-5 list-disc space-y-1 text-xs text-foreground/80">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

/** Blue context strip showing choices from earlier steps */
export function ContextStrip({ items }: { items: { icon: LucideIcon; label: string; value: string }[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-info-soft px-3 py-2 text-xs">
      {items.map(({ icon: Icon, label, value }) => (
        <span key={label} className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-primary" />
          {label}: <strong>{value}</strong>
        </span>
      ))}
    </div>
  )
}
