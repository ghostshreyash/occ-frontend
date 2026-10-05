import { Navigate } from "react-router"

import { DashboardPage } from "@/pages/dashboard"
import { homeFor } from "@/config/navigation"
import { useBrand } from "@/lib/brand"

/**
 * `/` is the command centre's dashboard. EVITA shares no screens with it — not
 * even this one — so a session opened through EVITA is sent to its own home
 * rather than being shown the OCC dashboard it has no business seeing.
 */
export function BrandHome() {
  const brand = useBrand()
  const home = homeFor(brand.key)
  if (home !== "/") return <Navigate to={home} replace />
  return <DashboardPage />
}
