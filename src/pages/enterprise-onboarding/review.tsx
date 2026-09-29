import { Building2, Check, Factory, Folder, MapPin, Network, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StepCard } from "@/components/common/wizard-layout"
import type { OnboardingData } from "./schemas"

type Row = { label: string; value?: string }

/** One reviewable section: heading, Edit shortcut back to its step, and its values read-only */
function Section({
  icon: Icon,
  title,
  step,
  onEdit,
  rows,
  children,
}: {
  icon: typeof Building2
  title: string
  step: number
  onEdit: (step: number) => void
  rows?: Row[]
  children?: React.ReactNode
}) {
  const filled = rows?.filter((r) => r.value && r.value.trim() !== "") ?? []
  return (
    <section className="rounded-lg ring-1 ring-foreground/10">
      <header className="flex items-center justify-between gap-2 rounded-t-lg bg-muted/60 px-3 py-1.5">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="size-3.5 text-primary" />
          {title}
        </h4>
        <Button type="button" variant="ghost" size="sm" className="h-6 text-[0.7rem]" onClick={() => onEdit(step)}>
          <Pencil className="size-3" /> Edit
        </Button>
      </header>

      <div className="p-3">
        {rows ? (
          filled.length > 0 ? (
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {filled.map((r) => (
                <div key={r.label} className="min-w-0">
                  <dt className="text-[0.65rem] text-muted-foreground">{r.label}</dt>
                  <dd className="truncate text-xs font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-muted-foreground">Not provided — this section is optional.</p>
          )
        ) : null}
        {children}
      </div>
    </section>
  )
}

/**
 * Step 6: everything captured so far, in view mode.
 * Each section links back to its own step, and the footer submits the whole payload.
 */
export function ReviewStep({
  data,
  onBack,
  onEdit,
  onSubmit,
  submitting,
}: {
  data: OnboardingData
  onBack: () => void
  onEdit: (step: number) => void
  onSubmit: () => void
  submitting: boolean
}) {
  const { enterprise: e, location: l, plant: p, department: d, subDepartments: subs, account } = data

  return (
    <StepCard
      title="Step 6 of 6: Review & Submit"
      formId="step-review"
      nextLabel="Submit Onboarding"
      nextIcon={<Check />}
      pending={submitting}
      onBack={onBack}
    >
      {/* The footer button submits this form */}
      <form
        id="step-review"
        onSubmit={(ev) => {
          ev.preventDefault()
          onSubmit()
        }}
        className="space-y-2.5"
      >
        <p className="text-xs text-muted-foreground">
          Check the details below. Use <strong>Edit</strong> on any section to change it, then come back here to submit.
        </p>

        <Section
          icon={Building2}
          title="Enterprise"
          step={0}
          onEdit={onEdit}
          rows={[
            { label: "Enterprise Name", value: e?.name },
            { label: "Type", value: e?.type },
            { label: "Short Name", value: e?.shortName },
            { label: "Industry Sector", value: e?.sector },
            { label: "Website", value: e?.website },
            { label: "Description", value: e?.description },
          ]}
        />

        <Section
          icon={MapPin}
          title="Location"
          step={1}
          onEdit={onEdit}
          rows={[
            { label: "Country", value: l?.country },
            { label: "State", value: l?.state },
            { label: "City", value: l?.city },
            { label: "Postal Code", value: l?.pin },
            { label: "Latitude", value: l?.latitude },
            { label: "Longitude", value: l?.longitude },
            { label: "Address", value: l?.address },
          ]}
        />

        <Section
          icon={Factory}
          title="Plant"
          step={2}
          onEdit={onEdit}
          rows={[
            { label: "Plant Name", value: p?.name },
            { label: "Plant Type", value: p?.type },
            { label: "Plant Code", value: p?.code },
            { label: "Plant Head", value: p ? [p.salutation, p.head].filter(Boolean).join(" ") : undefined },
            { label: "Email", value: p?.email },
            { label: "Phone Number", value: p?.phone },
            { label: "Capacity", value: p?.capacity },
            { label: "Commissioning Year", value: p?.commissioningYear },
            { label: "Time Zone", value: p?.timeZone },
            { label: "Address", value: p?.address },
            { label: "Notes", value: p?.notes },
          ]}
        />

        <Section
          icon={Network}
          title="Department"
          step={3}
          onEdit={onEdit}
          rows={[
            { label: "Department Name", value: d?.name },
            { label: "Department Code", value: d?.code },
            { label: "Type", value: d?.type },
            { label: "Parent Department", value: d?.parent },
            { label: "Head of Department", value: d?.head },
            { label: "Email", value: d?.email },
            { label: "Phone Number", value: d?.phone },
            { label: "Description", value: d?.description },
          ]}
        />

        <Section icon={Folder} title={`Sub-departments (${subs.length})`} step={4} onEdit={onEdit}>
          {subs.length === 0 ? (
            <p className="text-xs text-muted-foreground">None added — this section is optional.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-7 px-2 text-[0.65rem] uppercase">#</TableHead>
                    <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Name</TableHead>
                    <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Code</TableHead>
                    <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Function / Area</TableHead>
                    <TableHead className="hidden h-7 px-2 text-[0.65rem] uppercase sm:table-cell">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map((s, i) => (
                    <TableRow key={s.code || s.name}>
                      <TableCell className="px-2 py-1.5 text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="px-2 py-1.5 text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="px-2 py-1.5 text-xs">{s.code}</TableCell>
                      <TableCell className="px-2 py-1.5 text-xs">{s.function}</TableCell>
                      <TableCell className="hidden px-2 py-1.5 text-xs sm:table-cell">{s.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Section>

        <Section
          icon={Building2}
          title="Enterprise Administrator Account"
          step={4}
          onEdit={onEdit}
          rows={[
            { label: "Username", value: account?.username },
            // Never echo a password back, even in a review screen
            { label: "Password", value: account?.password ? "••••••••" : undefined },
          ]}
        />
      </form>
    </StepCard>
  )
}
