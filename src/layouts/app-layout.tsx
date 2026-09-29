import { Outlet } from "react-router"
import { Leaf } from "lucide-react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Topbar } from "@/components/layout/topbar"

export function AppLayout() {
  return (
    <SidebarProvider style={{ "--sidebar-width": "15rem" } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <Topbar />
        <main className="flex-1 p-3 md:p-4">
          <Outlet />
        </main>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-card px-4 py-2 text-[0.7rem] text-muted-foreground">
          <span>© {new Date().getFullYear()} Olivine Global Systems. All rights reserved.</span>
          <nav className="flex gap-3">
            <a href="#" className="hover:text-foreground">Terms of Use</a>|
            <a href="#" className="hover:text-foreground">Privacy Policy</a>|
            <a href="#" className="hover:text-foreground">Support</a>
          </nav>
          <span className="flex items-center gap-1.5 italic">
            <Leaf className="size-3.5 text-healthy" /> Reliable Today. Sustainable Tomorrow.
          </span>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  )
}
