import { useState } from "react"
import { toast } from "sonner"
import { Building2, ClipboardCheck, Factory, Folder, Network } from "lucide-react"

import { WizardPage, KeyInfo } from "@/components/common/wizard-layout"
import type { WizardStep } from "@/components/common/wizard"
import { DepartmentStep, EnterpriseStep, PlantStep, SubDepartmentAccountStep } from "./steps"
import { EnterpriseRegister } from "./register"
import { ReviewStep } from "./review"
import type { OnboardingData, PlantEntry } from "./schemas"

const keyInfo = [
  [
    "Each enterprise will have a unique ID in the OLIVINE system.",
    "The head office address is for correspondence and regional reporting.",
    "You can add multiple plants, departments and sub-departments as you go.",
    "Enterprise users will be created in a later step.",
    "Fields marked with * are mandatory.",
  ],
  [
    "One plant is added here. Further plants are added from the enterprise page afterwards.",
    "The plant carries its own location, because work is dispatched to the plant.",
    "Plant details help in organizing assets, departments and maintenance activities.",
    "Fields marked with * are mandatory.",
  ],
  [
    "A department groups related functions and teams within a plant.",
    "Add as many departments as this plant has.",
    "Ensure the department details are accurate for proper asset and maintenance mapping.",
    "Departments are optional — you can continue without any.",
  ],
  [
    "Pick a department, then add as many sub-departments under it as you need.",
    "Create the enterprise administrator username and password to access the EMMS-E portal.",
    "Sub-departments help in granular asset management and maintenance tracking.",
    "Ensure the account details are stored securely and shared only with authorised personnel.",
    "Fields marked with * are mandatory.",
  ],
  [
    "Everything you entered is shown here in view mode.",
    "Use Edit on any section to go back and change it.",
    "Department and sub-departments are optional and may be left empty.",
    "Submitting creates the enterprise and its administrator account.",
  ],
]

/**
 * Enterprise Onboarding.
 * Lands on the enterprise register (KPIs + table); "Onboard Enterprise" opens the 5-step wizard.
 */
export function EnterpriseOnboardingPage() {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({ plants: [] })

  const closeWizard = () => {
    setWizardOpen(false)
    setStep(0)
    setFurthest(0)
    setData({ plants: [] })
    window.scrollTo({ top: 0 })
  }

  if (!wizardOpen) {
    return <EnterpriseRegister onStart={() => { setWizardOpen(true); window.scrollTo({ top: 0 }) }} />
  }

  const plant = data.plants[0]
  const departmentCount = plant?.departments.length ?? 0
  const subCount = plant?.departments.reduce((m, d) => m + d.subDepartments.length, 0) ?? 0
  const count = (n: number, one: string, many = one + "s") => (n === 0 ? undefined : `${n} ${n === 1 ? one : many}`)
  const loc = data.location
  const steps: WizardStep[] = [
    {
      title: "Enterprise",
      description: "Enterprise details and head office",
      icon: Building2,
      summary: data.enterprise?.name ? [data.enterprise.name, loc?.city].filter(Boolean).join(" · ") : undefined,
    },
    { title: "Plant", description: "Add the plant under the enterprise", icon: Factory, summary: plant?.name },
    { title: "Departments", description: "Add departments under the plant", icon: Network, summary: count(departmentCount, "department") },
    { title: step === 3 ? "Sub-departments & Account" : "Sub-departments", description: "Add sub-departments under each department", icon: Folder, summary: count(subCount, "sub-department") },
    { title: "Review", description: "Check everything before submitting", icon: ClipboardCheck },
  ]

  const next = <K extends keyof OnboardingData>(key: K) => (values: OnboardingData[K]) => {
    setData((d) => ({ ...d, [key]: values }))
    setStep((s) => {
      const nextStep = s + 1
      setFurthest((f) => Math.max(f, nextStep))
      return nextStep
    })
    window.scrollTo({ top: 0 })
  }
  /** Steps that build a list advance themselves, having already written their rows into `data` */
  const advance = () => {
    setStep((s) => {
      const nextStep = s + 1
      setFurthest((f) => Math.max(f, nextStep))
      return nextStep
    })
    window.scrollTo({ top: 0 })
  }
  const setPlants = (plants: PlantEntry[]) => setData((d) => ({ ...d, plants }))
  const back = () => setStep((s) => Math.max(0, s - 1))
  /*
   * Any step already reached can be revisited, forward or back - each step
   * re-seeds its form from `data`, so nothing entered is lost either way.
   */
  const goToStep = (i: number) => {
    if (i <= furthest) {
      setStep(i)
      window.scrollTo({ top: 0 })
    }
  }

  return (
    <WizardPage
      title="Onboard Enterprise"
      breadcrumbs={[{ label: "Enterprises", onClick: closeWizard }, { label: "New Enterprise" }]}
      onExit={closeWizard}
      onStepSelect={goToStep}
      furthest={furthest}
      steps={steps}
      current={step}
      aside={<KeyInfo items={keyInfo[step]} />}
    >
      {step === 0 && (
        <EnterpriseStep
          data={data}
          onCancel={closeWizard}
          onNext={({ enterprise, location }) => {
            setData((d) => ({ ...d, enterprise, location }))
            advance()
          }}
        />
      )}
      {step === 1 && <PlantStep data={data} onPlantsChange={setPlants} onNext={advance} onBack={back} />}
      {step === 2 && <DepartmentStep data={data} onPlantsChange={setPlants} onNext={advance} onBack={back} />}
      {step === 3 && (
        <SubDepartmentAccountStep
          data={data}
          onBack={back}
          onPlantsChange={setPlants}
          onComplete={next("account")}
        />
      )}
      {step === 4 && (
        <ReviewStep
          data={data}
          onBack={back}
          onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
          submitting={submitting}
          onSubmit={async () => {
            setSubmitting(true)
            try {
              // TODO: POST /enterprises with the full onboarding payload.
              // Simulated latency so the Saving… state is visible until the API exists.
              await new Promise((resolve) => setTimeout(resolve, 600))
              toast.success(`${data.enterprise?.name} onboarded successfully`, {
                description: "The enterprise administrator can now log in to EMMS-E.",
              })
              // Back to the Enterprises register, where the new record belongs
              closeWizard()
            } finally {
              setSubmitting(false)
            }
          }}
        />
      )}
    </WizardPage>
  )
}
