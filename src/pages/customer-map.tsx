import { useState } from "react"
import { AlertTriangle, Building2, CloudCheck, Factory, FileCheck2, Maximize2, Server, Settings, ShieldCheck, TicketCheck, Users } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/common/page-header"
import { StatCard } from "@/components/common/stat-card"
import { SectionCard } from "@/components/common/section-card"
import { DonutChart } from "@/components/common/donut-chart"
import { CustomerMap } from "@/components/common/customer-map"
import { OperationsTables } from "@/components/common/operations-tables"
import { liveActivity, mapPlants, topCustomers } from "@/data/mock"
import { indiaEnterpriseStatus, indiaKpis, indiaPlantStatus } from "@/data/occ-tables"
import { healthStatus } from "@/lib/status"

const liveIcons = { plant: Building2, inspection: FileCheck2, alert: AlertTriangle, sync: CloudCheck, ticket: TicketCheck }
const liveTone = {
  plant: "bg-info-soft text-info",
  inspection: "bg-healthy-soft text-healthy",
  alert: "bg-critical-soft text-critical",
  sync: "bg-healthy-soft text-healthy",
  ticket: "bg-info-soft text-info",
}
const onboardingSlice = { label: "Onboarded", color: "var(--neutral)" }

/** India Customer Map — India-only view of customers, plants and asset health */
export function CustomerMapPage() {
  const [enterprise, setEnterprise] = useState("all")

  // India bounding box, so only domestic plants appear on this page
  const indiaPlants = mapPlants.filter((p) => p.lng > 68 && p.lng < 98 && p.lat > 6 && p.lat < 36)
  const plants = enterprise === "all" ? indiaPlants : indiaPlants.filter((p) => p.enterprise === enterprise)
  const indiaCustomers = topCustomers.filter((c) => indiaPlants.some((p) => p.enterprise === c.name))
  const maxAssets = Math.max(...indiaCustomers.map((c) => c.assets))

  return (
    <div className="space-y-3">
      <PageHeader
        title="India Customer Map"
        description="Real-time view of customer locations, plants and asset health status across India."
        breadcrumbs={[{ label: "India Customer Map" }]}
        actions={
          <>
            <Select value={enterprise} onValueChange={setEnterprise}>
              <SelectTrigger size="sm" className="w-36 bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {indiaCustomers.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex overflow-hidden rounded ring-1 ring-border">
              <button type="button" className="bg-brand-navy px-3 py-1 text-xs font-medium text-brand-navy-foreground">Map</button>
              <button type="button" className="bg-card px-3 py-1 text-xs font-medium hover:bg-muted">List</button>
            </div>
            <Button variant="outline" size="icon" className="size-7 bg-card" aria-label="Full screen">
              <Maximize2 className="size-3.5" />
            </Button>
          </>
        }
      />

      {/* Countries removed — this page is India only */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Total Customers" value={indiaKpis.enterprises.value} change={indiaKpis.enterprises.change} icon={Building2} tone="info" variant="plain" />
        <StatCard label="Total Plants" value={indiaKpis.plants.value} change={indiaKpis.plants.change} icon={Factory} tone="success" variant="plain" />
        <StatCard label="Total Assets (Monitored)" value={indiaKpis.assets.value} change={indiaKpis.assets.change} icon={Server} tone="info" variant="plain" />
        <StatCard
          label="Overall Asset Health"
          value={`${indiaKpis.healthy.percent}%`}
          icon={ShieldCheck}
          tone="healthy"
          variant="plain"
          footer={<Progress value={indiaKpis.healthy.percent} className="mt-1 h-1.5 w-24 [&>[data-slot=progress-indicator]]:bg-healthy" />}
        />
      </div>

      {/* Map keeps its right-hand column side by side from tablet up */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <CustomerMap plants={plants} view="india" className="h-[21rem] rounded-lg" />

        <div className="space-y-3">
        <SectionCard title="India Overview" viewAllTo="/enterprise-status">
          <div className="grid grid-cols-[1fr_1.25fr] items-center gap-2">
            <CustomerMap
              plants={indiaPlants}
              view="india"
              focusCountry="India"
              interactive={false}
              showLegend={false}
              className="h-24"
            />
            <div className="space-y-1.5">
              {[
                { icon: Users, label: "Customers", value: indiaKpis.enterprises.value },
                { icon: Factory, label: "Plants", value: indiaKpis.plants.value },
                { icon: Settings, label: "Assets", value: indiaKpis.assets.value },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded bg-info-soft text-primary">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.62rem] leading-none text-muted-foreground">{label}</div>
                    <div className="text-sm leading-tight font-bold tabular-nums">{value.toLocaleString("en-IN")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Top Customers by Asset Count" viewAllTo="/enterprise-status">
          <ul className="space-y-2 text-xs">
            {indiaCustomers.map((c) => (
              <li key={c.name} className="grid grid-cols-[2rem_1fr_2.5rem] items-center gap-1.5">
                <span className="flex h-5 items-center justify-center rounded bg-muted text-[0.55rem] font-bold text-brand-navy">
                  {c.name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[0.7rem]">{c.name}</div>
                  <Progress value={(c.assets / maxAssets) * 100} className="mt-0.5 h-1.5" />
                </div>
                <span className="text-right text-[0.7rem] font-semibold tabular-nums">{c.assets.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
        </div>
      </div>

      {/* Three cards in one row, same grid as the OCC Global dashboard */}
      <div className="grid gap-3 md:grid-cols-3">
        <SectionCard title="Asset Health (India)">
          <DonutChart
            centerLabel="Assets"
            data={(["healthy", "attention", "critical"] as const).map((s) => ({
              key: s,
              label: healthStatus[s].label,
              value: indiaKpis[s].value,
              color: healthStatus[s].color,
            }))}
          />
        </SectionCard>

        <SectionCard title="Enterprise Status (India)" viewAllTo="/enterprise-status">
          <DonutChart
            centerLabel="Enterprises"
            data={indiaEnterpriseStatus.map((s) => {
              const meta = s.status === "onboarding" ? onboardingSlice : healthStatus[s.status]
              return { key: s.status, label: meta.label, value: s.value, color: meta.color }
            })}
          />
        </SectionCard>

        <SectionCard title="Plant Status (India)" viewAllTo="/plant-status">
          <DonutChart
            centerLabel="Plants"
            data={indiaPlantStatus.map((s) => ({ key: s.status, label: healthStatus[s.status].label, value: s.value, color: healthStatus[s.status].color }))}
          />
        </SectionCard>
      </div>

      {/* Same operations tables as the global dashboard, filtered to India */}
      <OperationsTables country="India" />

      <SectionCard title="Real-time Activity" disabled>
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {liveActivity.map((a) => {
            const Icon = liveIcons[a.kind]
            return (
              <li key={a.time + a.title} className="flex items-start gap-2">
                <span className="w-8 shrink-0 pt-1 text-[0.65rem] tabular-nums text-muted-foreground">{a.time}</span>
                <span className={`flex size-6 shrink-0 items-center justify-center rounded ${liveTone[a.kind]}`}>
                  <Icon className="size-3" />
                </span>
                <div className="min-w-0 text-xs">
                  <div className="truncate font-medium">{a.title}</div>
                  <div className="truncate text-[0.65rem] text-muted-foreground">{a.detail}</div>
                </div>
              </li>
            )
          })}
        </ol>
      </SectionCard>
    </div>
  )
}
