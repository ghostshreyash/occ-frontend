import { createBrowserRouter, Navigate } from "react-router"

import { AppLayout } from "@/layouts/app-layout"
import { allNavigation } from "@/config/navigation"
import { PublicOnly, RequireAuth } from "@/components/auth/require-auth"
import { LandingPage } from "@/pages/landing"
import { LoginPage } from "@/pages/auth/login"
import { VerifyOtpPage } from "@/pages/auth/verify-otp"
import { ForgotPasswordPage } from "@/pages/auth/forgot-password"
import { VerifyResetPage } from "@/pages/auth/verify-reset"
import { ResetPasswordPage } from "@/pages/auth/reset-password"
import { RegisterPage } from "@/pages/auth/register"
import { AccountRecoveryPage } from "@/pages/auth/account-recovery"
import { BrandHome } from "@/components/auth/brand-home"
import { EvitaDashboardPage } from "@/pages/evita/dashboard"
import { AddInspectionActivityPage } from "@/pages/add-inspection-activity"
import { ElpremarOnboardingPage } from "@/pages/elpremar-onboarding"
import { ElpremarDetailPage } from "@/pages/elpremar-detail"
import { CriticalAlertsPage } from "@/pages/critical-alerts"
import { MaintenanceActivitiesPage } from "@/pages/maintenance-activities"
import { InspectionActivitiesPage } from "@/pages/inspection-activities"
import { MaintenanceActivityDetailsPage } from "@/pages/maintenance-activity-details"
import { InspectionActivityDetailsPage } from "@/pages/inspection-activity-details"
import { SupportTicketsPage } from "@/pages/support-tickets"
import { SupportTicketDetailsPage } from "@/pages/support-ticket-details"
import { RaiseSupportTicketPage } from "@/pages/raise-support-ticket"
import { ProfilePage } from "@/pages/profile"
import { ComingSoonPage } from "@/pages/coming-soon"
import { ThemePreview } from "@/components/theme-preview"
import { EnterpriseOnboardingPage } from "./pages/enterprise-onboarding"
import { EnterpriseDetailPage } from "./pages/enterprise-detail"

const built = new Set(["/", "/customer-map", "/enterprises", "/elpremars", "/critical-alerts", "/maintenance-activities", "/inspection-activities", "/support-tickets", "/evita"])

/*
 * The hostname decides which sign-in a visitor sees (`src/lib/brand.ts`), so
 * every deployment serves the same routes and signed-out visitors land on the
 * sign-in for their host — `/welcome` is an overview they can reach from there,
 * not a gate in front of it. `?brand=` overrides the host for demos only.
 */
export const router = createBrowserRouter([
  // Overview of the platform, for anyone unsure which system they need.
  { path: "/welcome", element: <LandingPage /> },

  { path: "/login", element: <PublicOnly><LoginPage /></PublicOnly> },
  { path: "/login/verify", element: <PublicOnly><VerifyOtpPage /></PublicOnly> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/forgot-password/verify", element: <VerifyResetPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/account-recovery", element: <AccountRecoveryPage /> },
  { path: "/theme-preview", element: <ThemePreview /> },

  // The console itself, behind sign-in
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <BrandHome /> },
          // Global and India map views now live inside the OCC dashboard.
          { path: "customer-map", element: <Navigate to="/" replace /> },
          { path: "enterprises", element: <EnterpriseOnboardingPage /> },
          { path: "enterprises/:id", element: <EnterpriseDetailPage /> },
          { path: "enterprise-onboarding", element: <Navigate to="/enterprises" replace /> },
          { path: "elpremars", element: <ElpremarOnboardingPage /> },
          { path: "elpremars/:id", element: <ElpremarDetailPage /> },
          // Old URL kept working for existing links
          { path: "elpremars/onboard", element: <Navigate to="/elpremars" replace /> },
          { path: "critical-alerts", element: <CriticalAlertsPage /> },
          { path: "maintenance-activities", element: <MaintenanceActivitiesPage /> },
          { path: "maintenance-activity-details/:id", element: <MaintenanceActivityDetailsPage /> },
          { path: "inspection-activities", element: <InspectionActivitiesPage /> },
          { path: "inspection-activities/add", element: <AddInspectionActivityPage /> },
          { path: "inspection-activity-details/:id", element: <InspectionActivityDetailsPage /> },
          { path: "evita", element: <EvitaDashboardPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "support-tickets", element: <SupportTicketsPage /> },
          { path: "support-tickets/raise", element: <RaiseSupportTicketPage /> },
          { path: "support-ticket-details/:id", element: <SupportTicketDetailsPage /> },
          // Remaining sidebar entries show a placeholder until their mockups exist
          ...allNavigation
            .filter((item) => !built.has(item.path))
            .map((item) => ({ path: item.path.slice(1), element: <ComingSoonPage title={item.title} /> })),
          { path: "*", element: <ComingSoonPage title="Page not found" /> },
        ],
      },
    ],
  },
])
