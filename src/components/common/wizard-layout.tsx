import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { KeyInfo, StepperBar, WizardProgressPanel, type WizardStep } from "@/components/common/wizard"

/** Page frame shared by the onboarding flows: header, stepper, form card, progress panel */
export function WizardPage({
  title,
  description,
  breadcrumbs,
  steps,
  current,
  furthest,
  aside,
  onExit,
  onStepSelect,
  children,
}: {
  title: string
  description?: string
  breadcrumbs: { label: string; to?: string; onClick?: () => void }[]
  steps: WizardStep[]
  current: number
  /** Highest step reached, so completed steps stay reachable in both directions */
  furthest?: number
  /** Extra content under the progress panel (key info, images) */
  aside?: React.ReactNode
  /** Leaves the wizard without completing it */
  onExit?: () => void
  /** Jump back to an already-completed step to change an earlier answer */
  onStepSelect?: (i: number) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          onExit ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onExit}>
              <ArrowLeft className="size-3.5" /> Back to Enterprises
            </Button>
          ) : null
        }
      />
      <StepperBar steps={steps} current={current} furthest={furthest} onSelect={onStepSelect} />
      {/* Progress panel sits to the right from tablet up, and sticks while the form scrolls */}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_17rem] lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">{children}</div>
        <div className="space-y-2.5 md:sticky md:top-3 md:self-start">
          <WizardProgressPanel steps={steps} current={current} furthest={furthest} onSelect={onStepSelect} />
          {aside}
        </div>
      </div>
    </div>
  )
}

/** White card holding one step's form, with Back / Next footer */
export function StepCard({
  title,
  description,
  children,
  onBack,
  onCancel,
  nextLabel,
  nextIcon = <ArrowRight />,
  pending = false,
  formId,
}: {
  title: string
  description?: string
  children: React.ReactNode
  onBack?: () => void
  onCancel?: () => void
  nextLabel: string
  nextIcon?: React.ReactNode
  /** Disables the footer and shows a spinner while the step is submitting */
  pending?: boolean
  /** id of the <form> the Next button submits */
  formId: string
}) {
  return (
    <section className="rounded-lg bg-card p-3 shadow-xs ring-1 ring-foreground/10 transition-shadow duration-200 ease-out hover:shadow-md">
      <h3 className="mb-2.5 text-sm font-bold text-brand-navy dark:text-foreground">{title}</h3>
      {description ? <p className="-mt-2 mb-2.5 text-xs text-muted-foreground">{description}</p> : null}
      {children}
      <div className="mt-4 flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        {onBack ? (
          <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={pending}>
            <ArrowLeft /> Back
          </Button>
        ) : null}
        <Button type="submit" form={formId} size="sm" className="min-w-28" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              {nextLabel} {nextIcon}
            </>
          )}
        </Button>
      </div>
    </section>
  )
}

export { KeyInfo }
