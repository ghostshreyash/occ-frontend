import { NavLink, useLocation } from "react-router"
import { Leaf } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { OlivineEmblem, OlivineLogo } from "@/components/layout/olivine-logo"
import { occNavigation } from "@/config/navigation"

function isActivePath(current: string, path: string) {
  return path === "/" ? current === "/" : current === path || current.startsWith(`${path}/`)
}

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 items-center justify-center bg-[#f7f4ee] p-1.5">
        <OlivineLogo className="h-full group-data-[collapsible=icon]:hidden" />
        <OlivineEmblem className="hidden size-8 group-data-[collapsible=icon]:block" />
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {occNavigation.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActivePath(pathname, item.path)}
                    tooltip={item.title}
                    className="h-10 data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground [&_svg]:size-[18px]"
                  >
                    <NavLink to={item.path}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.badge ? (
                    <SidebarMenuBadge className="top-2.5 rounded-full bg-critical text-critical-foreground">
                      {item.badge}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Mountain artwork from the mockups, fading into the navy sidebar */}
      <SidebarFooter className="relative overflow-hidden p-0 group-data-[collapsible=icon]:hidden">
        <img src="/brand/sidebar-mountains.jpg" alt="" className="h-40 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-sidebar via-transparent to-sidebar/80" />
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center gap-1 text-center text-sm text-white">
          <Leaf className="size-6 fill-healthy text-healthy" />
          <span>People. Technology. Reliability.</span>
          <span>A Greener Future.</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
