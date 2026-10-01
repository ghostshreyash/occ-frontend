import { useState } from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ClipboardCheck, HardHat, KeyRound, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { WizardPage, KeyInfo } from "@/components/common/wizard-layout"
import type { WizardStep } from "@/components/common/wizard"
import { BasicDetailsStep, CredentialsStep, ReviewStep, WorkSkillsStep } from "./steps"
import { ElpremarRegister } from "./register"
import type { ElpremarDraft } from "./schemas"

const steps: WizardStep[] = [
  { title: "Basic Details", description: "Personal and organisational information", icon: UserRound },
  { title: "Work & Skills", description: "Role, experience and certifications", icon: HardHat },
  { title: "Account Credentials", description: "Create username and password", icon: KeyRound },
  { title: "Review & Submit", description: "Verify details and complete onboarding", icon: ClipboardCheck },
]

const keyInfo = [
  [
    "Create a profile for each Electrical Preventive Maintenance Person (ELPREMAR).",
    "Username and password will be created in Step 3.",
    "Ensure correct department, plant and contact details for proper assignment.",
    "All fields marked with * are mandatory.",
  ],
  [
    "Capture accurate skills and certifications to enable proper task assignment.",
    "Multiple skills can be selected.",
    "Certifications help in compliance and safety management.",
    "You can add multiple training records.",
    "Fields marked with * are mandatory.",
  ],
  [
    "Create a unique username for each ELPREMAR.",
    "Ensure a strong password as per security policy.",
    "User will be able to login to the system after onboarding is completed.",
    "Login credentials can be shared via email or handover in a sealed format.",
    "Password can be reset later by an administrator if required.",
    "All fields marked with * are mandatory.",
  ],
]

const whatNext = [
  "The ELPREMAR profile will be created in the database.",
  "Login credentials will be activated.",
  "A welcome email/SMS will be sent to the ELPREMAR.",
  "The ELPREMAR can now access the system.",
  "You can proceed to the ELPREMAR Activity & Availability page to view and manage activities.",
]

function SkilledPeopleBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-navy to-primary p-5 text-brand-navy-foreground">
      <HardHat className="absolute -right-3 -bottom-3 size-28 text-brand-navy-foreground/10" />
      <div className="text-lg leading-snug font-bold">Skilled People.<br />Reliable Assets.<br />A Safer Tomorrow.</div>
    </div>
  )
}

/** ELPREMAR Onboarding, 4 steps (mockup pages 9–12) */
/**
 * ELPREMAR Onboarding.
 * Lands on the workforce register (KPIs + table); "Onboard ELPREMAR" opens the wizard.
 */
export function ElpremarOnboardingPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [draft, setDraft] = useState<ElpremarDraft>({})

  const closeWizard = () => {
    setWizardOpen(false)
    setStep(0)
    setFurthest(0)
    setDraft({})
    window.scrollTo({ top: 0 })
  }

  if (!wizardOpen) {
    return <ElpremarRegister onStart={() => { setWizardOpen(true); window.scrollTo({ top: 0 }) }} />
  }

  const go = (n: number) => {
    setStep(n)
    setFurthest((f) => Math.max(f, n))
    window.scrollTo({ top: 0 })
  }
  const save = <K extends keyof ElpremarDraft>(key: K) => (values: ElpremarDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: values }))
    go(step + 1)
  }

  const aside =
    step < 3 ? (
      <>
        <KeyInfo items={keyInfo[step]} />
        {step === 1 ? <SkilledPeopleBanner /> : null}
        {step === 0 ? (
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="h-7 bg-card text-xs" onClick={closeWizard}>
              <ArrowLeft className="size-3.5" /> Back to ELPREMARs
            </Button>
          </div>
        ) : null}
      </>
    ) : (
      <>
        <KeyInfo title="What happens next?" items={whatNext} />
        <Button variant="outline" size="sm" className="w-full bg-card text-xs text-primary" asChild>
          <Link to="/inspection-activities"><BarChart3 className="size-3.5" /> Inspection Activities <ArrowRight className="size-3.5" /></Link>
        </Button>
      </>
    )

  return (
    <WizardPage
      title="Onboard ELPREMAR"
      breadcrumbs={[{ label: "ELPREMARs", onClick: closeWizard }, { label: "New ELPREMAR" }]}
      onExit={closeWizard}
      onStepSelect={(i) => i <= furthest && go(i)}
      furthest={furthest}
      steps={steps}
      current={step}
      aside={aside}
    >
      {step === 0 && <BasicDetailsStep draft={draft} onNext={save("basic")} onCancel={closeWizard} />}
      {step === 1 && <WorkSkillsStep draft={draft} onNext={save("work")} onBack={() => go(0)} />}
      {step === 2 && <CredentialsStep draft={draft} onNext={save("credentials")} onBack={() => go(1)} />}
      {step === 3 && (
        <ReviewStep
          draft={draft}
          onBack={() => go(2)}
          onEdit={go}
          onSubmit={() => {
            // TODO: POST /elpremars
            toast.success(`${draft.basic?.fullName} onboarded as ELPREMAR`, {
              description: "Login credentials are now active.",
              icon: <CheckCircle2 className="size-4 text-healthy" />,
            })
            // Back to the register, where the new record belongs
            closeWizard()
          }}
        />
      )}
    </WizardPage>
  )
}
