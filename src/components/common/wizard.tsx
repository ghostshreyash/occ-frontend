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
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-semibold",
        state === "done" && "bg-healthy text-healthy-foreground",
        state === "current" && "bg-primary text-primary-foreground ring-2 ring-primary/15",
        state === "upcoming" && "bg-neutral text-neutral-foreground"
      )}
    >
      {state === "done" ? <Check className="size-3" strokeWidth={3} /> : index + 1}
    </span>
  )
}

const stateOf = (i: number, current: number) => (i < current ? "done" : i === current ? "current" : "upcoming")

/**
 * Horizontal step indicator across the top of an onboarding flow.
 * Completed steps are clickable, so you can go back and change an earlier answer;
 * upcoming steps are not, because their data has not been entered yet.
 */
export function StepperBar({ steps, current, onSelect }: { steps: WizardStep[]; current: number; onSelect?: (i: number) => void }) {
  return (
    <ol className="mb-3 flex items-center gap-1.5 overflow-x-auto rounded-lg bg-card px-3 py-2 shadow-xs ring-1 ring-foreground/10">
      {steps.map((step, i) => {
        const done = i < current
        const clickable = done && onSelect !== undefined
        const Label = clickable ? "button" : "span"
        return (
        <li key={step.title} className="flex min-w-fit flex-1 items-center gap-2 last:flex-none">
          <StepCircle index={i} state={stateOf(i, current)} />
          <Label
            {...(clickable ? { type: "button" as const, onClick: () => onSelect(i), title: `Go back to ${step.title}` } : {})}
            className={cn(
              "rounded-sm text-xs whitespace-nowrap",
              i === current ? "font-semibold text-primary" : "text-foreground",
              clickable && "cursor-pointer hover:text-primary hover:underline"
            )}
          >
            {step.title}
          </Label>
          {i < steps.length - 1 ? (
            <span className={cn("mx-1.5 h-px min-w-4 flex-1", i < current ? "bg-healthy" : "bg-border")} />
          ) : null}
        </li>
        )
      })}
    </ol>
  )
}

/** Right-hand "Onboarding Progress" panel with vertical steps */
export function WizardProgressPanel({ steps, current, onSelect }: { steps: WizardStep[]; current: number; onSelect?: (i: number) => void }) {
  const percent = Math.round(((current + 1) / steps.length) * 100)
  return (
    <div className="rounded-lg bg-card p-2.5 shadow-xs ring-1 ring-foreground/10 transition-[transform,box-shadow,--tw-ring-color] duration-200 ease-out hover:shadow-md hover:ring-foreground/20 motion-safe:hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Onboarding Progress</h3>
        <span className="text-[0.7rem] font-medium text-primary">
          Step {current + 1} of {steps.length}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Progress value={percent} className="h-1.5 [&>[data-slot=progress-indicator]]:bg-healthy" />
        <span className="text-[0.7rem] font-semibold">{percent}%</span>
      </div>

      <div className="mt-2.5 rounded-md bg-info-soft/60 p-2">
        <h4 className="mb-1.5 text-xs font-semibold">Onboarding Steps</h4>
        <ol className="space-y-0.5">
          {steps.map((step, i) => {
            const state = stateOf(i, current)
            const clickable = state === "done" && onSelect !== undefined
            return (
              <li key={step.title}>
                <div
                  {...(clickable
                    ? { role: "button" as const, tabIndex: 0, onClick: () => onSelect(i), onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(i)), title: `Go back to ${step.title}` }
                    : {})}
                  className={cn(
                    "flex items-center gap-2 rounded p-1.5 transition-colors duration-150",
                    state === "current" ? "bg-card shadow-xs" : "hover:bg-card/60",
                    clickable && "cursor-pointer"
                  )}
                >
                <step.icon className="size-3.5 shrink-0 text-brand-navy dark:text-foreground" />
                <StepCircle index={i} state={state} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-xs font-semibold">
                    {step.title}
                    {state === "done" ? <Check className="size-3 text-healthy" /> : null}
                  </div>
                  <div className="truncate text-[0.65rem] text-muted-foreground">
                    {state === "done" && step.summary ? step.summary : step.description}
                  </div>
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
    <div className="rounded-lg bg-healthy-soft p-2.5 ring-1 ring-healthy/20 transition-[transform,box-shadow] duration-200 ease-out hover:shadow-md motion-safe:hover:-translate-y-0.5">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
        <Lightbulb className="size-4 text-healthy" /> {title}
      </h4>
      <ul className="ml-4 list-disc space-y-0.5 text-[0.65rem] text-foreground/80">
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
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-info-soft px-2 py-1.5 text-[0.7rem]">
      {items.map(({ icon: Icon, label, value }) => (
        <span key={label} className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-primary" />
          {label}: <strong>{value}</strong>
        </span>
      ))}
    </div>
  )
}
