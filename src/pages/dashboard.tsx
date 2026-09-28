import { useState } from "react"
import { Link } from "react-router"
import {
  ArrowRight,
  Building2,
  Cloud,
  Factory,
  FileCheck2,
  Globe2,
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
import {
  criticalAlerts,
  enterpriseStatus,
  globalKpis,
  mapPlants,
  mapRegionLabels,
  plantStatus,
  recentActivities,
  systemConnectivity,
} from "@/data/mock"
import { alertSeverity, healthStatus, workStatus } from "@/lib/status"

const onboardingSlice = { label: "Onboarding", color: "var(--neutral)" }

const connectivityIcons = [Server, Cloud, Waypoints, RefreshCw]
const activityIcons = { enterprise: Building2, plant: Factory, inspection: FileCheck2, ticket: Database }

/** OCC Global Dashboard (mockup page 2) */
export function DashboardPage() {
  const [view, setView] = useState<MapView>("global")

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-navy dark:text-foreground">Welcome back, Admin!</h2>
          <p className="text-sm text-muted-foreground">
            Here&apos;s the real-time overview of Olivine&apos;s global electrical reliability operations.
          </p>
        </div>
        <div className="flex max-w-sm items-center gap-3 rounded-lg bg-info-soft px-4 py-2 text-sm italic">
          <Leaf className="size-5 shrink-0 text-healthy" />
          “One Platform. One Data. One Command Centre. For a Safer, More Reliable Tomorrow.”
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Enterprises" value={globalKpis.enterprises.value} change={globalKpis.enterprises.change} icon={Building2} tone="info" />
        <StatCard label="Total Plants" value={globalKpis.plants.value} change={globalKpis.plants.change} icon={Factory} tone="success" />
        <StatCard label="Total Assets (Monitored)" value={globalKpis.assets.value} change={globalKpis.assets.change} icon={Server} tone="highlight" />
        <StatCard label="Healthy Assets (Green)" value={globalKpis.healthy.value} percent={globalKpis.healthy.percent} icon={HeartPulse} tone="healthy" />
        <StatCard label="Attention (Orange)" value={globalKpis.attention.value} percent={globalKpis.attention.percent} icon={TriangleAlert} tone="attention" />
        <StatCard label="Critical (Red)" value={globalKpis.critical.value} percent={globalKpis.critical.percent} icon={ShieldAlert} tone="critical" />
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <SectionCard
          title="India / Global Customer Map"
          className="xl:col-span-3"
          actions={
            <>
              <div className="inline-flex rounded-md bg-muted p-0.5 text-xs font-medium">
                {(["global", "india"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={v === view ? "rounded bg-brand-navy px-4 py-1 text-brand-navy-foreground" : "rounded px-4 py-1 hover:bg-card"}
                  >
                    {v === "global" ? "Global" : "India"}
                  </button>
                ))}
                <Link to="/customer-map" className="rounded px-4 py-1 hover:bg-card">List View</Link>
              </div>
              <Link to="/customer-map" aria-label="Open full map" className="rounded-md p-1.5 text-muted-foreground ring-1 ring-border hover:bg-muted">
                <Maximize2 className="size-4" />
              </Link>
            </>
          }
        >
          <CustomerMap plants={mapPlants} view={view} regionLabels={mapRegionLabels} showControls={false} className="h-[22rem]">
            <div className="absolute top-3 right-3 bottom-3 flex w-32 flex-col gap-2">
              {[
                { icon: Globe2, value: globalKpis.enterprises.value, label: "Enterprises" },
                { icon: Factory, value: globalKpis.plants.value, label: "Plants" },
                { icon: MapPin, value: globalKpis.countries, label: "Countries" },
                { icon: HardHat, value: globalKpis.elpremars, label: "ELPREMARs" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex flex-1 items-center gap-2 rounded-lg bg-brand-navy/85 px-3 text-brand-navy-foreground ring-1 ring-white/15 backdrop-blur-sm">
                  <Icon className="size-5 shrink-0 text-brand-navy-foreground/80" />
                  <div>
                    <div className="text-base leading-none font-bold">{value.toLocaleString("en-IN")}</div>
                    <div className="text-[0.7rem] text-brand-navy-foreground/75">{label}</div>
                  </div>
                </div>
              ))}
              <Link to="/customer-map" className="flex items-center justify-end gap-1 text-xs text-brand-navy-foreground/85 hover:text-brand-navy-foreground">
                View Full Map <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </CustomerMap>
        </SectionCard>

        <SectionCard title="Critical Alerts" viewAllTo="/critical-alerts" className="xl:col-span-2" contentClassName="px-2">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Time</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Asset / Location</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criticalAlerts.slice(0, 5).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">{a.time}</TableCell>
                  <TableCell>
                    <Badge className={`rounded-md ${alertSeverity[a.severity].className}`}>{alertSeverity[a.severity].label}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{a.asset}</div>
                    <div className="text-xs text-muted-foreground">(Plant: {a.plant})</div>
                  </TableCell>
                  <TableCell className="max-w-40 whitespace-normal">{a.issue}</TableCell>
                  <TableCell>
                    <Badge variant={workStatus[a.status].badge} className="rounded-md">{workStatus[a.status].label}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
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
            data={plantStatus.map((s) => ({
              key: s.status,
              label: healthStatus[s.status].label,
              value: s.value,
              color: healthStatus[s.status].color,
            }))}
          />
        </SectionCard>

        <SectionCard title="System Connectivity" viewAllTo="/emmse-connectivity" className="lg:col-span-2 xl:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            {systemConnectivity.map((s, i) => {
              const Icon = connectivityIcons[i]
              return (
                <div key={s.name} className="flex items-start gap-3 rounded-lg bg-healthy-soft p-3">
                  <Icon className="size-7 shrink-0 text-healthy" />
                  <div className="min-w-0 text-sm">
                    <div className="font-medium">{s.name}</div>
                    <div className="font-bold text-healthy-soft-foreground">{s.status}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent Activities" viewAllTo="/evita-activity">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recentActivities.map((a) => {
            const Icon = activityIcons[a.kind]
            return (
              <div key={a.title} className="flex items-center gap-3 border-l-2 border-primary/30 pl-3 first:border-l-0 first:pl-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-healthy-soft text-healthy">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="truncate font-medium">{a.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{a.detail}</div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{a.time}</span>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
