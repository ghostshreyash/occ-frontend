import { useMemo, useState } from "react"
import { Building2, CheckCircle2, Factory, Plus, Search, UserPlus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/common/page-header"
import { StatCard } from "@/components/common/stat-card"
import { SectionCard } from "@/components/common/section-card"
import { enterpriseRecords, enterpriseRegisterKpis } from "@/data/occ-tables"
import { healthStatus } from "@/lib/status"

const th = "h-7 px-2 text-[0.65rem] font-semibold tracking-wide uppercase"
const td = "px-2 py-1.5 text-xs"

const onboardingBadge = { label: "Onboarding", badge: "neutral" as const }

/** Enterprise register: KPIs, the full enterprise table, and the entry point to the wizard */
export function EnterpriseRegister({ onStart }: { onStart: () => void }) {
  const [query, setQuery] = useState("")
  const [type, setType] = useState("all")

  const types = useMemo(() => [...new Set(enterpriseRecords.map((e) => e.type))], [])

  const rows = enterpriseRecords.filter((e) => {
    const matchesType = type === "all" || e.type === type
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      e.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.sector.toLowerCase().includes(q) ||
      e.country.toLowerCase().includes(q)
    return matchesType && matchesQuery
  })

  return (
    <div className="space-y-3">
      <PageHeader
        title="Enterprise Onboarding"
        description="Register new enterprises and build the organisational structure for seamless electrical reliability management."
        breadcrumbs={[{ label: "Enterprise Onboarding" }]}
        actions={
          <Button size="sm" className="h-7 text-xs" onClick={onStart}>
            <Plus className="size-3.5" /> Onboard Enterprise
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard label="Total Enterprises" value={enterpriseRegisterKpis.total} icon={Building2} tone="info" variant="plain" />
        <StatCard label="Active" value={enterpriseRegisterKpis.active} icon={CheckCircle2} tone="healthy" variant="plain" />
        <StatCard label="In Onboarding" value={enterpriseRegisterKpis.onboarding} icon={UserPlus} tone="attention" variant="plain" />
        <StatCard label="Total Plants" value={enterpriseRegisterKpis.plants} icon={Factory} tone="success" variant="plain" />
      </div>

      <SectionCard
        title="Registered Enterprises"
        contentClassName="px-1 overflow-x-auto"
        actions={
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID, sector…"
                className="h-7 w-44 pl-7 text-xs"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger size="sm" className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className={th}>Enterprise ID</TableHead>
              <TableHead className={th}>Enterprise Name</TableHead>
              <TableHead className={th}>Type</TableHead>
              <TableHead className={cnHidden("md")}>Industry Sector</TableHead>
              <TableHead className={cnHidden("lg")}>Location</TableHead>
              <TableHead className={th}>Plants</TableHead>
              <TableHead className={cnHidden("sm")}>Assets</TableHead>
              <TableHead className={cnHidden("lg")}>ELPREMARs</TableHead>
              <TableHead className={cnHidden("md")}>Onboarded</TableHead>
              <TableHead className={th}>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e) => {
              const meta = e.status === "onboarding" ? onboardingBadge : healthStatus[e.status]
              return (
                <TableRow key={e.id}>
                  <TableCell className={`${td} font-medium text-primary`}>{e.id}</TableCell>
                  <TableCell className={`${td} font-medium`}>{e.name}</TableCell>
                  <TableCell className={td}>{e.type}</TableCell>
                  <TableCell className={`${td} hidden md:table-cell`}>{e.sector}</TableCell>
                  <TableCell className={`${td} hidden lg:table-cell`}>
                    <div>{e.city}</div>
                    <div className="text-[0.65rem] text-muted-foreground">{e.country}</div>
                  </TableCell>
                  <TableCell className={`${td} tabular-nums`}>{e.plants}</TableCell>
                  <TableCell className={`${td} hidden tabular-nums sm:table-cell`}>{e.assets.toLocaleString("en-IN")}</TableCell>
                  <TableCell className={`${td} hidden tabular-nums lg:table-cell`}>{e.elpremars}</TableCell>
                  <TableCell className={`${td} hidden tabular-nums md:table-cell`}>{e.onboarded}</TableCell>
                  <TableCell className={td}>
                    <Badge variant={meta.badge} className="rounded px-1.5 py-0 text-[0.65rem]">{meta.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-6 text-center text-xs text-muted-foreground">
                  No enterprises match your search.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  )
}

/** Column headers that only appear from a given breakpoint up */
function cnHidden(bp: "sm" | "md" | "lg") {
  return `${th} hidden ${bp}:table-cell`
}
