import { useState } from "react"
import { toast } from "sonner"
import { Building2, ClipboardCheck, Factory } from "lucide-react"

import { WizardPage, KeyInfo } from "@/components/common/wizard-layout"
import type { WizardStep } from "@/components/common/wizard"
import { createEnterprise } from "@/lib/api/enterprises"
import { resolveLocationIds } from "@/lib/api/locations"
import { createEnterpriseAdmin } from "@/lib/api/users"
import { messageFor } from "@/lib/api/use-resource"
import { EnterpriseStep, PlantStructureStep } from "./steps"
import { EnterpriseRegister } from "./register"
import { ReviewStep } from "./review"
import type { OnboardingData, PlantEntry } from "./schemas"

const keyInfo = [
  [
    "Each enterprise will have a unique ID in the OLIVINE system.",
    "The head office address is for correspondence and regional reporting.",
    "You can add multiple plants, departments and sub-departments as you go.",
    "Add Enterprise Admin creates the administrator login for the EMMS-E portal.",
    "Fields marked with * are mandatory.",
  ],
  [
    "The plant, its departments and their sub-departments are one structure, so they are captured together.",
    "One plant is added here. Further plants are added from the enterprise page afterwards.",
    "Departments and sub-departments are optional — you can continue without any.",
    "A sub-department sits under a department, so add the department first.",
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

  /* Several plants can be added in one pass, so every count is across all of them */
  const plantCount = data.plants.length
  const departmentCount = data.plants.reduce((m, p) => m + p.departments.length, 0)
  const subCount = data.plants.reduce((m, p) => m + p.departments.reduce((n, d) => n + d.subDepartments.length, 0), 0)
  const count = (n: number, one: string, many = one + "s") => (n === 0 ? undefined : `${n} ${n === 1 ? one : many}`)
  const loc = data.location
  const structureSummary = [count(plantCount, "plant"), count(departmentCount, "department"), count(subCount, "sub-department")]
    .filter(Boolean)
    .join(" · ")
  const steps: WizardStep[] = [
    {
      title: "Enterprise",
      description: "Enterprise details and head office",
      icon: Building2,
      summary: data.enterprise?.name ? [data.enterprise.name, loc?.city].filter(Boolean).join(" · ") : undefined,
    },
    {
      title: "Plant & Structure",
      description: "Plant, its departments and sub-departments",
      icon: Factory,
      summary: structureSummary || undefined,
    },
    { title: "Review", description: "Check everything before submitting", icon: ClipboardCheck },
  ]

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
          onAccountChange={(account) => setData((d) => ({ ...d, account }))}
          onNext={({ enterprise, location }) => {
            setData((d) => ({ ...d, enterprise, location }))
            advance()
          }}
        />
      )}
      {step === 1 && (
        <PlantStructureStep
          data={data}
          onPlantsChange={setPlants}
          onNext={advance}
          onBack={back}
          title="Step 2 of 3: Plant, Departments & Sub-departments"
        />
      )}
      {step === 2 && (
        <ReviewStep
          data={data}
          onBack={back}
          onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
          submitting={submitting}
          onSubmit={async () => {
            setSubmitting(true)
            try {
              /*
               * The enterprise, its plants and their departments are one
               * transactional call. The administrator's login is a second one,
               * against a different endpoint, so the two can succeed
               * separately - and that is reported rather than smoothed over:
               * an enterprise that exists without its login needs someone to
               * finish the job, and a toast claiming success would hide it.
               */
              const ids = await resolveLocationIds(data.location?.country, data.location?.state)
              const created = await createEnterprise(data, ids)

              let adminError: string | undefined
              if (data.account) {
                try {
                  await createEnterpriseAdmin(created.enterprise.name, data.account.email, data.account.password)
                } catch (e) {
                  adminError = messageFor(e)
                }
              }

              if (adminError) {
                toast.warning(`${created.enterprise.name} onboarded, but the administrator login was not created`, {
                  description: `${adminError} Create the login from Manage Users.`,
                  duration: 12_000,
                })
              } else {
                toast.success(`${created.enterprise.name} onboarded successfully`, {
                  description: data.account
                    ? "The enterprise administrator can now log in to EMMS-E."
                    : "No administrator login was requested.",
                })
              }

              // Back to the Enterprises register, where the new record belongs
              closeWizard()
            } catch (e) {
              /* The wizard stays open with everything typed still in it, so the
                 operator can correct what the API objected to and resubmit. */
              toast.error("Could not onboard the enterprise", { description: messageFor(e), duration: 12_000 })
            } finally {
              setSubmitting(false)
            }
          }}
        />
      )}
    </WizardPage>
  )
}
