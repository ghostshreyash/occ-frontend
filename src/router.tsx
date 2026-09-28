import { createBrowserRouter } from "react-router"

import { AppLayout } from "@/layouts/app-layout"
import { occNavigation } from "@/config/navigation"
import { LoginPage } from "@/pages/login"
import { DashboardPage } from "@/pages/dashboard"
import { CustomerMapPage } from "@/pages/customer-map"
import { EnterpriseOnboardingPage } from "@/pages/enterprise-onboarding"
import { ElpremarActivityPage } from "@/pages/elpremar-activity"
import { ElpremarOnboardingPage } from "@/pages/elpremar-onboarding"
import { CriticalAlertsPage } from "@/pages/critical-alerts"
import { ComingSoonPage } from "@/pages/coming-soon"
import { ThemePreview } from "@/components/theme-preview"

const built = new Set(["/", "/customer-map", "/enterprise-onboarding", "/elpremars", "/critical-alerts"])

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/theme-preview", element: <ThemePreview /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "customer-map", element: <CustomerMapPage /> },
      { path: "enterprise-onboarding", element: <EnterpriseOnboardingPage /> },
      { path: "elpremars", element: <ElpremarActivityPage /> },
      { path: "elpremars/onboard", element: <ElpremarOnboardingPage /> },
      { path: "critical-alerts", element: <CriticalAlertsPage /> },
      // Remaining sidebar entries show a placeholder until their mockups exist
      ...occNavigation
        .filter((item) => !built.has(item.path))
        .map((item) => ({ path: item.path.slice(1), element: <ComingSoonPage title={item.title} /> })),
      { path: "*", element: <ComingSoonPage title="Page not found" /> },
    ],
  },
])
