import { useMemo, useState } from "react"
import {
  ArrowRight,
  Building2,
  Cloud,
  Factory,
  FileCheck2,
  HardHat,
  HeartPulse,
  Leaf,
  MapPin,
  RefreshCw,
  Server,
  ShieldAlert,
  TriangleAlert,
  Waypoints,
  Database,
} from "lucide-react"

import { Link } from "react-router"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatCard } from "@/components/common/stat-card"
import { CountUp } from "@/components/common/count-up"
import { SectionCard } from "@/components/common/section-card"
import { DonutChart } from "@/components/common/donut-chart"
import { ClassificationDonut } from "@/components/common/classification-donut"
import { classify, enterpriseClassification, indiaEnterpriseClassification } from "@/data/enterprise-classification"
import { elpremarRecords } from "@/data/elpremar-data"
import { CustomerMap, MapViewToggle, type MapView } from "@/components/common/customer-map"
import { OperationsTables } from "@/components/common/operations-tables"
import {
  criticalAlerts,
  globalKpis,
  mapPlants,
  mapRegionLabels,
  recentActivities,
  regionSummary,
  systemConnectivity,
} from "@/data/mock"
import { topCustomers } from "@/data/mock"
import { indiaKpis } from "@/data/occ-tables"
import { alertSeverity, chartSeries, healthStatus, workStatus, type HealthStatus } from "@/lib/status"

/**
 * Health wording for this screen only.
 *
 * "Critical" is reserved for an asset's functional importance, so a *state*
 * never carries that word here: the bands read Healthy / Alarming / At Risk.
 * The shared `healthStatus` labels are deliberately left alone — the rest of
 * the console still reads from them.
 */
const bandLabel: Record<HealthStatus, string> = {
  healthy: "Healthy",
  attention: "Alarming",
  critical: "At Risk",
  offline: healthStatus.offline.label,
}

const connectivityIcons = [Server, Cloud, Waypoints, RefreshCw]
const activityIcons = { enterprise: Building2, plant: Factory, inspection: FileCheck2, ticket: Database }

/** Dashboard */
export function DashboardPage() {
  const [view, setView] = useState<MapView>("global")
  const indiaPlants = mapPlants.filter((p) => p.lng > 68 && p.lng < 98 && p.lat > 6 && p.lat < 36)
  const plants = view === "india" ? indiaPlants : mapPlants
  const kpis = view === "india" ? indiaKpis : globalKpis
  /*
   * Registration standing off the ELPREMAR master data, so the donut agrees with
   * the register it links to. Active/Inactive is administrative — green and a
   * neutral grey, never a warning colour, because an inactive account is an
   * admin state rather than a health or risk condition.
   */
  // Sector on the inner ring, scale on the outer — rolled up from the two fields
  const classification = useMemo(
    () => classify(view === "india" ? indiaEnterpriseClassification : enterpriseClassification),
    [view]
  )

  const elpremarStatus = useMemo(() => {
    const roster = view === "india" ? elpremarRecords.filter((e) => e.country === "India") : elpremarRecords
    const active = roster.filter((e) => e.status === "active").length
    return [
      { key: "active", label: "Active", value: active, color: "var(--success)" },
      { key: "inactive", label: "Inactive", value: roster.length - active, color: "var(--neutral)" },
    ]
  }, [view])

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
        <StatCard label={view === "india" ? "Total Enterprises" : "Total Enterprises"} value={kpis.enterprises.value} change={kpis.enterprises.change} icon={Building2} tone="info" />
        <StatCard label="Total Plants" value={kpis.plants.value} change={kpis.plants.change} icon={Factory} tone="success" />
        <StatCard label="Total Assets" value={kpis.assets.value} change={kpis.assets.change} icon={Server} tone="highlight" />
        <StatCard label="Healthy Assets" value={kpis.healthy.value} percent={kpis.healthy.percent} icon={HeartPulse} tone="healthy" />
        <StatCard label="Alarming" value={kpis.attention.value} percent={kpis.attention.percent} icon={TriangleAlert} tone="attention" />
        <StatCard label="At Risk" value={kpis.critical.value} percent={kpis.critical.percent} icon={ShieldAlert} tone="critical" />
      </div>

      {/* Map with Enterprise Distribution alongside it, side by side from tablet up */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <SectionCard
          title={view === "india" ? "India Enterprise Map" : "Global Enterprise Map"}
          actions={
            <>
              <MapViewToggle value={view} onChange={setView} labels={{ global: "Global", india: "India" }} className="text-[0.7rem]" />
            </>
          }
        >
          <CustomerMap
            plants={plants}
            view={view}
            regionLabels={view === "global" ? mapRegionLabels : undefined}
            showLegend={false}
            expandable
            title={view === "india" ? "India Enterprise Map" : "Global Enterprise Map"}
            className="h-[24rem]"
          >
            {/* Countries + ELPREMARs only — enterprises and plants already lead the KPI strip above */}
            <div className="absolute top-2 left-2 flex gap-1.5">
              {[
                { icon: MapPin, value: view === "india" ? 1 : globalKpis.countries, label: "Countries" },
                { icon: HardHat, value: view === "india" ? indiaKpis.elpremars : globalKpis.elpremars, label: "ELPREMARs" },
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
                  {bandLabel[s]}
                </li>
              ))}
            </ul>
          </CustomerMap>
        </SectionCard>

        {view === "global" ? (
          <SectionCard title={<span>Enterprise Distribution <span className="font-normal text-muted-foreground">(by Region)</span></span>}>
            <DonutChart
              centerLabel="Customers"
              size={140}
              layout="stacked"
              data={regionSummary.map((r, i) => ({ key: `r${i}`, label: r.region, value: r.customers, color: chartSeries[i % chartSeries.length] }))}
            />
          </SectionCard>
        ) : (
          <SectionCard title="India Overview">
            <div className="grid grid-cols-[1fr_1.2fr] items-center gap-3">
              <CustomerMap plants={indiaPlants} view="india" focusCountry="India" interactive={false} marker="pin-sm" showLegend={false} className="h-32" />
              <div className="space-y-2">
                {[
                  ["Enterprises", indiaKpis.enterprises.value],
                  ["Plants", indiaKpis.plants.value],
                  ["Assets", indiaKpis.assets.value],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <CountUp value={Number(value)} className="font-bold" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 border-t pt-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold">Top 5 Enterprises By Assets</span>
                <Link
                  to="/enterprise-status"
                  className="flex shrink-0 items-center gap-0.5 text-[0.7rem] font-medium whitespace-nowrap text-primary hover:underline"
                >
                  View All <ArrowRight className="size-3" />
                </Link>
              </div>
              <ul className="divide-y text-xs">
                {topCustomers.slice(0, 5).map((customer) => (
                  <li key={customer.name} className="flex items-center gap-2 py-1.5 first:pt-0 last:pb-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[0.55rem] font-bold text-brand-navy">
                      {customer.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 3)
                        .toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{customer.name}</span>
                    <span className="font-semibold tabular-nums">{customer.assets.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        )}
      </div>

      {/*
        Status donuts: Enterprise, Plant, Asset Health — one row from tablet up
        (same grid as the India page).

        Raised above the rows that follow it: a card lifts on hover, and that
        transform makes it a stacking context, so a chart tooltip that overflows
        the card would otherwise be painted over by the tables below.
      */}
      <div className="relative z-20 grid gap-3 md:grid-cols-3">
        <SectionCard
          title={view === "india" ? "Enterprise Classification (India)" : "Enterprise Classification"}
          viewAllTo="/enterprises"
        >
          <ClassificationDonut centerLabel="Enterprises" data={classification} />
        </SectionCard>

        <SectionCard title={view === "india" ? "ELPREMAR Status (India)" : "ELPREMAR Status"} viewAllTo="/elpremars">
          <DonutChart centerLabel="Registered" data={elpremarStatus} />
        </SectionCard>

        <SectionCard title={view === "india" ? "Asset Health (India)" : "Asset Health (Global)"}>
          <DonutChart
            centerLabel="Assets"
            data={(["healthy", "attention", "critical"] as const).map((s) => ({
              key: s,
              label: bandLabel[s],
              value: kpis[s].value,
              color: healthStatus[s].color,
            }))}
          />
        </SectionCard>
      </div>

      {/* Maintenance / Tasks / Tickets */}
      <OperationsTables country={view === "india" ? "India" : undefined} />

      {/*
       * Bottom block: Critical Alerts on the right; the two modules that are not
       * live yet sit on the left, under a "Coming in Phase 2" overlay.
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
