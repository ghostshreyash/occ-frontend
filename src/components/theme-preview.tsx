import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { alertSeverity, healthStatus, workStatus, type HealthStatus } from "@/lib/status"

const swatches: { name: string; className: string }[] = [
  { name: "primary", className: "bg-primary text-primary-foreground" },
  { name: "brand-navy", className: "bg-brand-navy text-brand-navy-foreground" },
  { name: "brand-gold", className: "bg-brand-gold text-brand-gold-foreground" },
  { name: "healthy", className: "bg-healthy text-healthy-foreground" },
  { name: "attention", className: "bg-attention text-attention-foreground" },
  { name: "critical", className: "bg-critical text-critical-foreground" },
  { name: "info", className: "bg-info text-info-foreground" },
  { name: "offline", className: "bg-offline text-offline-foreground" },
  { name: "highlight", className: "bg-highlight text-highlight-foreground" },
  { name: "secondary", className: "bg-secondary text-secondary-foreground" },
  { name: "muted", className: "bg-muted text-muted-foreground" },
  { name: "accent", className: "bg-accent text-accent-foreground" },
]

/** Visual reference for the OCC colour tokens. Safe to delete once real screens exist. */
export function ThemePreview() {
  return (
    <div className="flex min-h-svh">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-sidebar p-3 text-sidebar-foreground md:flex">
        <div className="mb-4 px-2 text-lg font-bold text-brand-gold">OLIVINE</div>
        <div className="rounded-md bg-sidebar-primary px-3 py-2 text-sm text-sidebar-primary-foreground">
          Dashboard
        </div>
        {["Customer Map", "Enterprise Onboarding", "Critical Alerts"].map((item) => (
          <div key={item} className="rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
            {item}
          </div>
        ))}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between bg-topbar px-6 text-topbar-foreground">
          <span className="font-semibold">Olivine Command Centre (OCC)</span>
          <span className="text-sm text-topbar-muted-foreground">Theme preview</span>
        </header>

        <main className="space-y-8 p-6">
          <section className="space-y-3">
            <h2 className="font-semibold">Colour tokens</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {swatches.map((s) => (
                <div key={s.name} className={`rounded-lg p-4 text-sm font-medium ${s.className}`}>
                  {s.name}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">KPI tiles</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {(Object.keys(healthStatus) as HealthStatus[]).map((key) => (
                <div key={key} className={`rounded-xl p-4 ${healthStatus[key].tile}`}>
                  <div className="text-sm">{healthStatus[key].label} Assets</div>
                  <div className="text-2xl font-bold text-foreground">1,234</div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border bg-card p-4 text-card-foreground">
            <h2 className="font-semibold">Badges &amp; buttons</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(healthStatus) as HealthStatus[]).map((key) => (
                <Badge key={key} variant={healthStatus[key].badge}>
                  <span className={`size-1.5 rounded-full ${healthStatus[key].dot}`} />
                  {healthStatus[key].label}
                </Badge>
              ))}
              {Object.values(alertSeverity).map((s) => (
                <Badge key={s.label} className={s.className}>{s.label}</Badge>
              ))}
              {Object.values(workStatus).map((s) => (
                <Badge key={s.label} variant={s.badge}>{s.label}</Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button>Next: Location</Button>
              <Button variant="outline">Back</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="brand">LOG IN</Button>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold">Chart series</h2>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div key={n} className="h-8 flex-1 rounded" style={{ background: `var(--chart-${n})` }} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
