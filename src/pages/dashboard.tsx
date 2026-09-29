import { useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  Building2,
  Cloud,
  Factory,
  FileCheck2,
  HardHat,
  HeartPulse,
  Leaf,
  Maximize2,
  MapPin,
  RefreshCw,
  Server,
  ShieldAlert,
  TriangleAlert,
  Waypoints,
  Database,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/common/stat-card"
import { SectionCard } from "@/components/common/section-card"
import { DonutChart } from "@/components/common/donut-chart"
import { CustomerMap, type MapView } from "@/components/common/customer-map"
import { OperationsTables } from "@/components/common/operations-tables"
import {
  criticalAlerts,
  enterpriseStatus,
  globalKpis,
  mapPlants,
  mapRegionLabels,
  plantStatus,
  recentActivities,
  regionSummary,
  systemConnectivity,
} from "@/data/mock"
import { alertSeverity, chartSeries, healthStatus, workStatus } from "@/lib/status"

const onboardingSlice = { label: "Onboarding", color: "var(--neutral)" }

const connectivityIcons = [Server, Cloud, Waypoints, RefreshCw]
const activityIcons = { enterprise: Building2, plant: Factory, inspection: FileCheck2, ticket: Database }

/** OCC Global Dashboard */
export function DashboardPage() {
  const [view, setView] = useState<MapView>("global")

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-brand-navy dark:text-foreground">Welcome back, Admin!</h2>
          <p className="text-xs text-muted-foreground">
            Here&apos;s the real-time overview of Olivine&apos;s global electrical reliability operations.
          </p>
        </div>
        <div className="flex max-w-xs items-center gap-2 rounded-md bg-info-soft px-3 py-1.5 text-[0.7rem] italic">
          <Leaf className="size-4 shrink-0 text-healthy" />
          “One Platform. One Data. One Command Centre.”
        </div>
      </div>

      {/* KPI strip: 2-up on tablet, 3-up on md, 6-up on wide */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Enterprises" value={globalKpis.enterprises.value} change={globalKpis.enterprises.change} icon={Building2} tone="info" />
        <StatCard label="Total Plants" value={globalKpis.plants.value} change={globalKpis.plants.change} icon={Factory} tone="success" />
        <StatCard label="Total Assets (Monitored)" value={globalKpis.assets.value} change={globalKpis.assets.change} icon={Server} tone="highlight" />
        <StatCard label="Healthy Assets (Green)" value={globalKpis.healthy.value} percent={globalKpis.healthy.percent} icon={HeartPulse} tone="healthy" />
        <StatCard label="Attention (Orange)" value={globalKpis.attention.value} percent={globalKpis.attention.percent} icon={TriangleAlert} tone="attention" />
        <StatCard label="Critical (Red)" value={globalKpis.critical.value} percent={globalKpis.critical.percent} icon={ShieldAlert} tone="critical" />
      </div>

      {/* Map with Customer Distribution alongside it, side by side from tablet up */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <SectionCard
          title="India / Global Customer Map"
          actions={
            <>
              <div className="inline-flex rounded bg-muted p-0.5 text-[0.7rem] font-medium">
                {(["global", "india"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={v === view ? "rounded bg-brand-navy px-2.5 py-0.5 text-brand-navy-foreground" : "rounded px-2.5 py-0.5 hover:bg-card"}
                  >
                    {v === "global" ? "Global" : "India"}
                  </button>
                ))}
                <Link to="/customer-map" className="rounded px-2.5 py-0.5 hover:bg-card">List</Link>
              </div>
              <Link to="/customer-map" aria-label="Open full map" className="rounded p-1 text-muted-foreground ring-1 ring-border hover:bg-muted">
                <Maximize2 className="size-3.5" />
              </Link>
            </>
          }
        >
          <CustomerMap plants={mapPlants} view={view} regionLabels={mapRegionLabels} showControls={false} showLegend={false} className="h-[19rem]">
            {/* Countries + ELPREMARs only — enterprises and plants already lead the KPI strip above */}
            <div className="absolute top-2 left-2 flex gap-1.5">
              {[
                { icon: MapPin, value: globalKpis.countries, label: "Countries" },
                { icon: HardHat, value: globalKpis.elpremars, label: "ELPREMARs" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-1.5 rounded-md bg-brand-navy/85 px-2 py-1 text-brand-navy-foreground ring-1 ring-white/15 backdrop-blur-sm">
                  <Icon className="size-3.5 shrink-0 text-brand-navy-foreground/80" />
                  <div>
                    <div className="text-xs leading-none font-bold tabular-nums">{value.toLocaleString("en-IN")}</div>
                    <div className="text-[0.6rem] text-brand-navy-foreground/75">{label}</div>
                  </div>
                </div>
              ))}
            </div>
            <ul className="absolute bottom-2 left-2 flex gap-2 rounded-md bg-brand-navy/85 px-2 py-1 text-[0.62rem] text-brand-navy-foreground ring-1 ring-white/10">
              {(["healthy", "attention", "critical"] as const).map((s) => (
                <li key={s} className="flex items-center gap-1">
                  <span className={`size-1.5 rounded-full ${healthStatus[s].dot}`} />
                  {healthStatus[s].label}
                </li>
              ))}
            </ul>
            <Link to="/customer-map" className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-brand-navy/85 px-2 py-1 text-[0.65rem] text-brand-navy-foreground/85 ring-1 ring-white/10 hover:text-brand-navy-foreground">
              View Full Map <ArrowRight className="size-3" />
            </Link>
          </CustomerMap>
        </SectionCard>

        <SectionCard title={<span>Customer Distribution <span className="font-normal text-muted-foreground">(by Region)</span></span>}>
          <DonutChart
            centerLabel="Customers"
            size={96}
            data={regionSummary.map((r, i) => ({ key: `r${i}`, label: r.region, value: r.customers, color: chartSeries[i % chartSeries.length] }))}
          />
        </SectionCard>
      </div>

      {/* Status donuts: Enterprise, Plant, Asset Health — one row from tablet up (same grid as the India page) */}
      <div className="grid gap-3 md:grid-cols-3">
        <SectionCard title="Enterprise Status" viewAllTo="/enterprise-status">
          <DonutChart
            centerLabel="Enterprises"
            data={enterpriseStatus.map((s) => {
              const meta = s.status === "onboarding" ? onboardingSlice : healthStatus[s.status]
              return { key: s.status, label: meta.label, value: s.value, color: meta.color }
            })}
          />
        </SectionCard>

        <SectionCard title="Plant Status" viewAllTo="/plant-status">
          <DonutChart
            centerLabel="Plants"
            data={plantStatus.map((s) => ({ key: s.status, label: healthStatus[s.status].label, value: s.value, color: healthStatus[s.status].color }))}
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
      </div>

      {/* Maintenance / Tasks / Tickets */}
      <OperationsTables />

      {/*
       * Bottom block: Critical Alerts on the right; the two modules that are not
       * live yet sit on the left, faded and marked Disabled.
       */}
      <div className="grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <SectionCard title="System Connectivity" disabled>
            <div className="grid grid-cols-2 gap-1.5">
              {systemConnectivity.map((s, i) => {
                const Icon = connectivityIcons[i]
                return (
                  <div key={s.name} className="flex items-start gap-1.5 rounded bg-healthy-soft p-1.5">
                    <Icon className="size-4 shrink-0 text-healthy" />
                    <div className="min-w-0 text-[0.65rem]">
                      <div className="truncate font-medium">{s.name}</div>
                      <div className="font-bold text-healthy-soft-foreground">{s.status}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </SectionCard>

          <SectionCard title="Recent Activities" disabled>
            <div className="space-y-1.5">
              {recentActivities.slice(0, 2).map((a) => {
                const Icon = activityIcons[a.kind]
                return (
                  <div key={a.title} className="flex items-center gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-healthy-soft text-healthy">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="truncate font-medium">{a.title}</div>
                      <div className="truncate text-[0.65rem] text-muted-foreground">{a.detail}</div>
                    </div>
                    <span className="shrink-0 text-[0.65rem] text-muted-foreground">{a.time}</span>
                  </div>
                )
              })}
              <span className="flex items-center gap-1 pt-0.5 text-[0.7rem] font-medium text-primary">
                View All <ArrowRight className="size-3" />
              </span>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Critical Alerts" disabled contentClassName="px-1 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60 hover:bg-muted/60">
                <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Time</TableHead>
                <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Severity</TableHead>
                <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Asset / Location</TableHead>
                <TableHead className="hidden h-7 px-2 text-[0.65rem] uppercase sm:table-cell">Issue</TableHead>
                <TableHead className="h-7 px-2 text-[0.65rem] uppercase">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criticalAlerts.slice(0, 6).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="px-2 py-1.5 text-xs tabular-nums text-muted-foreground">{a.time}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge className={`rounded px-1.5 py-0 text-[0.65rem] ${alertSeverity[a.severity].className}`}>{alertSeverity[a.severity].label}</Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-xs">
                    <div className="font-medium">{a.asset}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{a.plant}</div>
                  </TableCell>
                  <TableCell className="hidden max-w-48 px-2 py-1.5 text-xs whitespace-normal sm:table-cell">{a.issue}</TableCell>
                  <TableCell className="px-2 py-1.5">
                    <Badge variant={workStatus[a.status].badge} className="rounded px-1.5 py-0 text-[0.65rem]">{workStatus[a.status].label}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </div>
  )
}
