import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react"

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
  aside,
  children,
}: {
  title: string
  description: string
  breadcrumbs: { label: string; to?: string }[]
  steps: WizardStep[]
  current: number
  /** Extra content under the progress panel (key info, images) */
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          <Button variant="outline" className="bg-card">
            <BookOpen /> View Onboarding Guide
          </Button>
        }
      />
      <StepperBar steps={steps} current={current} />
      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0">{children}</div>
        <div className="space-y-4">
          <WizardProgressPanel steps={steps} current={current} />
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
  formId,
}: {
  title: string
  description: string
  children: React.ReactNode
  onBack?: () => void
  onCancel?: () => void
  nextLabel: string
  nextIcon?: React.ReactNode
  /** id of the <form> the Next button submits */
  formId: string
}) {
  return (
    <section className="rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/10">
      <h3 className="text-lg font-bold text-brand-navy dark:text-foreground">{title}</h3>
      <p className="mb-5 text-sm text-muted-foreground">{description}</p>
      {children}
      <div className="mt-6 flex justify-end gap-3">
        {onCancel ? (
          <Button type="button" variant="outline" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {onBack ? (
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            <ArrowLeft /> Back
          </Button>
        ) : null}
        <Button type="submit" form={formId} size="lg" className="min-w-40">
          {nextLabel} {nextIcon}
        </Button>
      </div>
    </section>
  )
}

export { KeyInfo }
