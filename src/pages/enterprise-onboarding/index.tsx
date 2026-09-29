import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { Building2, Factory, Folder, MapPin, Network } from "lucide-react"

import { WizardPage, KeyInfo } from "@/components/common/wizard-layout"
import type { WizardStep } from "@/components/common/wizard"
import { DepartmentStep, EnterpriseStep, LocationStep, PlantStep, SubDepartmentAccountStep } from "./steps"
import { EnterpriseRegister } from "./register"
import type { OnboardingData } from "./schemas"

const keyInfo = [
  [
    "Each enterprise will have a unique ID in the OLIVINE system.",
    "You can add multiple plants, departments and sub-departments after creating the enterprise.",
    "Enterprise users will be created in a later step.",
    "Fields marked with * are mandatory.",
  ],
  [
    "Provide accurate location details for better asset mapping and support.",
    "You can select the location on the map for precise coordinates.",
    "Location details will help in regional reporting, compliance and faster service response.",
    "Fields marked with * are mandatory.",
  ],
  [
    "A location can have multiple plants.",
    "Each plant will be linked to the selected location and enterprise.",
    "Plant details help in organizing assets, departments and maintenance activities.",
    "You can add multiple plants after completing this step.",
    "Fields marked with * are mandatory.",
  ],
  [
    "A department groups related functions and teams within a plant.",
    "You can add the head of department and contact details for better coordination.",
    "Ensure the department details are accurate for proper asset and maintenance mapping.",
    "Fields marked with * are mandatory.",
  ],
  [
    "You can add multiple sub-departments under the selected department.",
    "Create the enterprise administrator username and password to access the EMMS-E portal.",
    "Sub-departments help in granular asset management and maintenance tracking.",
    "Ensure the account details are stored securely and shared only with authorised personnel.",
    "Fields marked with * are mandatory.",
  ],
]

/**
 * Enterprise Onboarding.
 * Lands on the enterprise register (KPIs + table); "Onboard Enterprise" opens the 5-step wizard.
 */
export function EnterpriseOnboardingPage() {
  const navigate = useNavigate()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [furthest, setFurthest] = useState(0)
  const [data, setData] = useState<OnboardingData>({ subDepartments: [] })

  const closeWizard = () => {
    setWizardOpen(false)
    setStep(0)
    setFurthest(0)
    setData({ subDepartments: [] })
    window.scrollTo({ top: 0 })
  }

  if (!wizardOpen) {
    return <EnterpriseRegister onStart={() => { setWizardOpen(true); window.scrollTo({ top: 0 }) }} />
  }

  const loc = data.location
  const steps: WizardStep[] = [
    { title: "Enterprise", description: "Enter enterprise details", icon: Building2, summary: data.enterprise?.name },
    { title: "Location", description: "Add country, state, city or site location", icon: MapPin, summary: loc ? `${loc.city}, ${loc.state}, ${loc.country}` : undefined },
    { title: "Plant", description: "Add plant under the enterprise", icon: Factory, summary: data.plant?.name },
    { title: "Department", description: "Add department under the plant", icon: Network, summary: data.department?.name },
    { title: step === 4 ? "Sub-department & Account" : "Sub-department", description: "Add sub-department under the department", icon: Folder },
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
      {step === 0 && <EnterpriseStep data={data} onNext={next("enterprise")} onCancel={closeWizard} />}
      {step === 1 && <LocationStep data={data} onNext={next("location")} onBack={back} />}
      {step === 2 && <PlantStep data={data} onNext={next("plant")} onBack={back} />}
      {step === 3 && <DepartmentStep data={data} onNext={next("department")} onBack={back} />}
      {step === 4 && (
        <SubDepartmentAccountStep
          data={data}
          onBack={back}
          onSubDepartmentsChange={(subDepartments) => setData((d) => ({ ...d, subDepartments }))}
          onComplete={async () => {
            // TODO: POST /enterprises with the full onboarding payload.
            // Simulated latency so the Saving… state is visible until the API exists.
            await new Promise((resolve) => setTimeout(resolve, 600))
            toast.success(`${data.enterprise?.name} onboarded successfully`, {
              description: "The enterprise administrator can now log in to EMMS-E.",
            })
            navigate("/enterprise-status")
          }}
        />
      )}
    </WizardPage>
  )
}
