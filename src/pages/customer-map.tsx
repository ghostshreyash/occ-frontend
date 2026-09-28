import { useState } from "react"
import { AlertTriangle, Building2, CloudCheck, Factory, FileCheck2, Maximize2, MapPin, Settings, ShieldCheck, TicketCheck, Users } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/common/page-header"
import { StatCard } from "@/components/common/stat-card"
import { SectionCard } from "@/components/common/section-card"
import { DonutChart } from "@/components/common/donut-chart"
import { CustomerMap, MapViewToggle, type MapView } from "@/components/common/customer-map"
import { globalKpis, indiaOverview, liveActivity, mapPlants, mapRegionLabels, regionSummary, topCustomers } from "@/data/mock"
import { chartSeries, healthStatus } from "@/lib/status"

const liveIcons = { plant: Building2, inspection: FileCheck2, alert: AlertTriangle, sync: CloudCheck, ticket: TicketCheck }
const liveTone = {
  plant: "bg-info-soft text-info",
  inspection: "bg-healthy-soft text-healthy",
  alert: "bg-critical-soft text-critical",
  sync: "bg-healthy-soft text-healthy",
  ticket: "bg-info-soft text-info",
}

/** India / Global Customer Map (mockup page 3) */
export function CustomerMapPage() {
  const [view, setView] = useState<MapView>("global")
  const [enterprise, setEnterprise] = useState("all")
  const maxAssets = Math.max(...topCustomers.map((c) => c.assets))
  const plants = enterprise === "all" ? mapPlants : mapPlants.filter((p) => p.enterprise === enterprise)

  return (
    <div className="space-y-5">
      <PageHeader
        title="India / Global Customer Map"
        description="Real-time view of all customer locations, plants and asset health status across India and worldwide."
        actions={
          <>
            <Select value={enterprise} onValueChange={setEnterprise}>
              <SelectTrigger className="w-44 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {topCustomers.map((c) => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex overflow-hidden rounded-md ring-1 ring-border">
              <button type="button" className="bg-brand-navy px-6 py-1.5 text-sm font-medium text-brand-navy-foreground">Map</button>
              <button type="button" className="bg-card px-6 py-1.5 text-sm font-medium hover:bg-muted">List</button>
            </div>
            <Button variant="outline" size="icon" className="bg-card" aria-label="Full screen">
              <Maximize2 />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Customers" value={globalKpis.enterprises.value} change={globalKpis.enterprises.change} icon={Building2} tone="info" variant="plain" />
        <StatCard label="Total Plants" value={globalKpis.plants.value} change={globalKpis.plants.change} icon={Factory} tone="success" variant="plain" />
        <StatCard label="Countries" value={globalKpis.countries} icon={MapPin} tone="info" variant="plain" />
        <StatCard label="Total Assets (Monitored)" value={globalKpis.assets.value} change={globalKpis.assets.change} icon={Users} tone="info" variant="plain" />
        <StatCard
          label="Overall Asset Health"
          value={`${globalKpis.healthy.percent}%`}
          icon={ShieldCheck}
          tone="healthy"
          variant="plain"
          footer={<Progress value={globalKpis.healthy.percent} className="mt-2 h-2.5 w-40 [&>[data-slot=progress-indicator]]:bg-healthy" />}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
        <CustomerMap plants={plants} view={view} regionLabels={mapRegionLabels} className="h-[27rem] rounded-xl">
          <MapViewToggle value={view} onChange={setView} className="absolute top-3 left-3" />
        </CustomerMap>

        <div className="space-y-5">
          <SectionCard title="India Overview" viewAllTo="/enterprise-status">
            <div className="grid grid-cols-[1fr_8.5rem] gap-3">
              <CustomerMap
                plants={mapPlants.filter((p) => p.lng > 68 && p.lng < 98 && p.lat > 6 && p.lat < 36)}
                view="india"
                focusCountry="India"
                interactive={false}
                showLegend={false}
                className="h-40"
              />
              <div className="space-y-3">
                {[
                  { icon: Users, label: "Customers", value: indiaOverview.customers },
                  { icon: Factory, label: "Plants", value: indiaOverview.plants },
                  { icon: Settings, label: "Assets", value: indiaOverview.assets },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-info-soft text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-lg leading-tight font-bold">{value.toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Top 5 Customers by Asset Count" viewAllTo="/enterprise-status">
            <ul className="space-y-3 text-sm">
              {topCustomers.map((c) => (
                <li key={c.name} className="grid grid-cols-[2.25rem_7rem_1fr_3rem] items-center gap-2">
                  <span className="flex h-6 items-center justify-center rounded bg-muted text-[0.6rem] font-bold text-brand-navy">
                    {c.name.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase()}
                  </span>
                  <span className="truncate text-xs">{c.name}</span>
                  <Progress value={(c.assets / maxAssets) * 100} className="h-2" />
                  <span className="text-right text-xs font-semibold">{c.assets.toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard title={<span className="leading-tight">Customer Distribution<span className="block text-xs font-normal text-muted-foreground">(by Region)</span></span>}>
          <DonutChart
            centerLabel="Customers"
            data={regionSummary.map((r, i) => ({ key: `r${i}`, label: r.region, value: r.customers, color: chartSeries[i % chartSeries.length] }))}
          />
        </SectionCard>

        <SectionCard title="Asset Health (Global)">
          <DonutChart
            centerLabel="Assets"
            data={(["healthy", "attention", "critical"] as const).map((s) => ({
              key: s,
              label: healthStatus[s].label,
              value: globalKpis[s].value,
              color: healthStatus[s].color,
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Real-time Activity"
          actions={<Badge variant="healthy"><span className="size-1.5 animate-pulse rounded-full bg-healthy" /> Live</Badge>}
          className="lg:col-span-2 xl:col-span-1"
        >
          <ol className="relative space-y-4 border-l border-dashed border-border pl-5">
            {liveActivity.map((a) => {
              const Icon = liveIcons[a.kind]
              return (
                <li key={a.time + a.title} className="relative flex items-start gap-3">
                  <span className="absolute top-2 -left-[1.4rem] size-2 rounded-full bg-primary" />
                  <span className="w-10 shrink-0 pt-1 text-xs text-muted-foreground">{a.time}</span>
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${liveTone[a.kind]}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 text-sm">
                    <div className="font-medium">{a.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.detail}</div>
                  </div>
                </li>
              )
            })}
          </ol>
        </SectionCard>
      </div>
    </div>
  )
}
