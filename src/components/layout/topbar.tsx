import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { format } from "date-fns"
import { Bell, ChevronDown, Leaf, LogOut, UserRound } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth/context"

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function Topbar() {
  const now = useClock()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-topbar-border bg-topbar px-4 text-topbar-foreground">
      <SidebarTrigger className="text-topbar-foreground hover:bg-white/10 hover:text-topbar-foreground" />

      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold leading-tight">Olivine Command Centre (OCC)</h1>
        <p className="hidden text-[0.7rem] tracking-wide text-topbar-muted-foreground sm:block">
          REAL-TIME VISIBILITY &nbsp;|&nbsp; FASTER RESPONSE &nbsp;|&nbsp; HIGHER RELIABILITY
        </p>
      </div>

      <div className="ml-auto hidden items-center gap-2 text-sm italic text-topbar-muted-foreground lg:flex">
        <Leaf className="size-4 text-healthy" />
        Powering a Safer, Smarter Tomorrow
      </div>

      <div className="hidden border-l border-topbar-border pl-4 text-right text-sm leading-tight md:block">
        <div className="text-topbar-muted-foreground">{format(now, "EEE, d MMM yyyy")}</div>
        <div className="font-semibold">{format(now, "hh:mm:ss a")} (IST)</div>
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className="relative rounded-full p-2 hover:bg-white/10 max-md:ml-auto"
      >
        <Bell className="size-5" />
        <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-critical text-[0.6rem] font-bold text-critical-foreground">
          5
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none hover:bg-white/10">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary font-semibold text-primary-foreground">{user?.initials ?? "A"}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{user?.name ?? "Admin"}</span>
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{user?.role ?? "OLIVINE Admin"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserRound /> My Profile
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => {
              signOut()
              navigate("/login?reason=signed-out", { replace: true })
            }}>
            <LogOut /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
