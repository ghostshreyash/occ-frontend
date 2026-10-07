import { useState } from "react"
import { Building2, ClipboardCheck, Factory, Folder, Network } from "lucide-react"

import { WizardPage, KeyInfo, StepCard } from "@/components/common/wizard-layout"
import type { WizardStep } from "@/components/common/wizard"
import { ValueGrid, type DetailRow } from "@/components/common/detail-section"
import { sectorLabelFor } from "@/data/master-data"
import type { EnterpriseProfile } from "@/data/occ-tables"
import { DepartmentStep, PlantStep, SubDepartmentAccountStep } from "./steps"
import { ReviewStep } from "./review"
import type { OnboardingData, PlantEntry } from "./schemas"

const keyInfo = [
  [
    "These are the enterprise details captured when it was onboarded.",
    "They cannot be changed from here — use Edit on the enterprise page instead.",
    "The head office is for correspondence; a plant carries its own address and coordinates.",
    "Continue to add one or more plants under this enterprise.",
  ],
  [
    "Add as many plants as you need — each one is created under this enterprise.",
    "Each plant carries its own location, because work is dispatched to the plant.",
    "At least one plant is required to continue.",
    "Fields marked with * are mandatory.",
  ],
  [
    "A department groups related functions and teams within a plant.",
    "Pick a plant, then add as many departments as it has.",
    "Departments are optional — you can continue without any.",
  ],
  [
    "Pick a department, then add as many sub-departments under it as you need.",
    "Sub-departments help in granular asset management and maintenance tracking.",
    "No account is created here — this enterprise already has its administrator.",
  ],
  [
    "Everything you entered is shown here in view mode.",
    "Use Edit on a plant, department or sub-department to change it.",
    "The enterprise and its head office are shown for reference and cannot be changed.",
    "Submitting adds these plants to the enterprise.",
  ],
]

/**
 * Adding plants to an enterprise that already exists. It is the onboarding
 * wizard with the first two steps already answered: the enterprise and its head
 * office are shown, in order, so they can be checked on the way through, but
 * they belong to a record that is already live and are not editable here.
 */
export function AddPlantWizard({
  profile,
  onCancel,
  onSubmit,
}: {
  profile: EnterpriseProfile
  onCancel: () => void
  onSubmit: (plants: PlantEntry[]) => Promise<void> | void
}) {
  const [step, setStep] = useState(1)
  /* Step 1 is answered already, so the first step that asks anything is reachable from the start */
  const [furthest, setFurthest] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    enterprise: {
      name: profile.enterprise.name,
      shortName: profile.enterprise.shortName,
      sectorType: profile.enterprise.sectorType,
      sector: profile.enterprise.sector,
      website: profile.enterprise.website,
      description: profile.enterprise.description,
    },
    location: { ...profile.location },
    plants: [],
  })

  const e = profile.enterprise
  const l = profile.location
  const departmentCount = data.plants.reduce((n, p) => n + p.departments.length, 0)
  const subCount = data.plants.reduce((n, p) => n + p.departments.reduce((m, d) => m + d.subDepartments.length, 0), 0)
  const count = (n: number, one: string) => (n === 0 ? undefined : `${n} ${n === 1 ? one : one + "s"}`)

  const steps: WizardStep[] = [
    { title: "Enterprise", description: "Already onboarded", icon: Building2, summary: `${e.name} · ${l.city}` },
    { title: "Plants", description: "Add the new plants", icon: Factory, summary: count(data.plants.length, "plant") },
    { title: "Departments", description: "Add departments under each plant", icon: Network, summary: count(departmentCount, "department") },
    { title: "Sub-departments", description: "Add sub-departments under each department", icon: Folder, summary: count(subCount, "sub-department") },
    { title: "Review", description: "Check everything before submitting", icon: ClipboardCheck },
  ]

  const advance = () => {
    setStep((s) => {
      const nextStep = s + 1
      setFurthest((f) => Math.max(f, nextStep))
      return nextStep
    })
    window.scrollTo({ top: 0 })
  }
  const back = () => setStep((s) => Math.max(0, s - 1))
  const goToStep = (i: number) => {
    if (i <= furthest) {
      setStep(i)
      window.scrollTo({ top: 0 })
    }
  }
  const setPlants = (plants: PlantEntry[]) => setData((d) => ({ ...d, plants }))

  /* The answered step reads rather than asks */
  const settled = (title: string, nextLabel: string, note: string, rows: DetailRow[]) => (
    <StepCard title={title} formId="step-settled" nextLabel={nextLabel} onCancel={onCancel}>
      <form id="step-settled" onSubmit={(ev) => { ev.preventDefault(); advance() }} />
      <p className="mb-2.5 text-xs text-muted-foreground">{note}</p>
      <ValueGrid rows={rows} />
    </StepCard>
  )

  return (
    <WizardPage
      title={`Add Plant — ${e.name}`}
      breadcrumbs={[{ label: "Enterprises", to: "/enterprises" }, { label: e.name, onClick: onCancel }, { label: "Add Plant" }]}
      onExit={onCancel}
      exitLabel={`Back to ${e.name}`}
      onStepSelect={goToStep}
      furthest={furthest}
      steps={steps}
      current={step}
      aside={<KeyInfo items={keyInfo[step]} />}
    >
      {step === 0 &&
        settled(
          "Step 1 of 5: Enterprise Details",
          "Next: Plant",
          "Captured when this enterprise was onboarded. Change it from the enterprise page, not here. Each plant you add carries its own address and coordinates.",
          [
            { label: "Enterprise Name", value: e.name },
            { label: "Short Name", value: e.shortName },
            { label: "Type", value: e.sectorType },
            { label: sectorLabelFor(e.sectorType), value: e.sector },
            { label: "Website", value: e.website },
            { label: "Country", value: l.country },
            { label: "State", value: l.state },
            { label: "City", value: l.city },
            { label: "Postal Code", value: l.pin },
            { label: "Address (Head Office)", value: l.address, wide: true },
            { label: "Description", value: e.description, wide: true },
          ]
        )}

      {step === 1 && <PlantStep data={data} onPlantsChange={setPlants} onNext={advance} onBack={back} />}
      {step === 2 && <DepartmentStep data={data} onPlantsChange={setPlants} onNext={advance} onBack={back} />}
      {step === 3 && (
        <SubDepartmentAccountStep data={data} onBack={back} onPlantsChange={setPlants} onComplete={advance} withAccount={false} />
      )}
      {step === 4 && (
        <ReviewStep
          data={data}
          onBack={back}
          onChange={(patch) => setData((d) => ({ ...d, ...patch }))}
          submitting={submitting}
          title="Step 5 of 5: Review & Add"
          submitLabel={data.plants.length === 1 ? "Add Plant" : `Add ${data.plants.length} Plants`}
          readOnly={["enterprise", "location"]}
          onSubmit={async () => {
            setSubmitting(true)
            try {
              // TODO: POST /enterprises/:id/plants with this payload
              await onSubmit(data.plants)
            } finally {
              setSubmitting(false)
            }
          }}
        />
      )}
    </WizardPage>
  )
}
