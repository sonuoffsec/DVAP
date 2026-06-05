"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect } from "react"
import {
  LayoutDashboard, FlaskConical, Flag, Microscope, CirclePlay,
  BarChart2, GitBranch, Bug, Shield, FileText, Settings,
  ShieldAlert, ChevronLeft, ChevronRight, ChevronDown, Cpu, Boxes,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useHealth } from "@/hooks/useHealth"

const NAV = [
  {
    label: "Platform",
    items: [
      { href: "/overview",      label: "Overview",            icon: LayoutDashboard },
      { href: "/labs",          label: "Labs",                icon: FlaskConical },
      { href: "/ctf",           label: "CTF Challenges",      icon: Flag },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/research",      label: "Research Workspace",  icon: Microscope },
      { href: "/attack-replay", label: "Attack Campaigns",    icon: CirclePlay },
      { href: "/benchmarks",    label: "Benchmarks",          icon: BarChart2 },
      { href: "/models",        label: "Model Hub",           icon: Boxes },
    ],
  },
  {
    label: "Evaluation",
    items: [
      { href: "/threat-models", label: "Threat Models",       icon: GitBranch },
      { href: "/findings",      label: "Findings",            icon: Bug },
      { href: "/reports",       label: "Reports",             icon: FileText },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/soc",           label: "AI-SOC",              icon: Shield },
    ],
  },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const {
    sidebarCollapsed, toggleSidebar,
    mobileSidebarOpen, toggleMobileSidebar, setMobileSidebarOpen,
  } = useAppStore()
  const { data: health } = useHealth()
  const up = health?.status === "healthy"

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname, setMobileSidebarOpen])

  // Close mobile sidebar when viewport becomes desktop
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setMobileSidebarOpen(false)
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [setMobileSidebarOpen])

  return (
    <>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={toggleMobileSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex h-screen flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar",
          "transition-transform duration-200 ease-in-out",
          "lg:relative lg:inset-auto lg:z-auto lg:translate-x-0",
          sidebarCollapsed ? "w-[56px]" : "w-[260px]",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand / Logo */}
        <div className={cn(
          "shrink-0",
          sidebarCollapsed ? "flex h-[58px] items-center justify-center border-b border-sidebar-border" : "border-b border-sidebar-border"
        )}>
          {sidebarCollapsed ? (
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 shadow-[0_0_16px_#7c3aed40]">
              <ShieldAlert className="h-5 w-5 text-white" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
            </div>
          ) : (
            <Image
              src="/dvap-logo-cropped.png"
              alt="DVAP"
              width={1260}
              height={594}
              style={{ width: "100%", height: "auto", display: "block" }}
              priority
              unoptimized
            />
          )}
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-4">
            {NAV.map((section) => (
              <div key={section.label}>
                {!sidebarCollapsed && (
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/35">
                    {section.label}
                  </p>
                )}
                <div className="space-y-px">
                  {section.items.map((item) => {
                    const active =
                      pathname === item.href ||
                      (item.href !== "/overview" && pathname.startsWith(item.href + "/"))
                    const Icon = item.icon

                    const link = (
                      <Link
                        href={item.href}
                        className={cn(
                          "group relative flex h-8 items-center gap-2.5 rounded-md text-[13px] transition-all duration-100",
                          sidebarCollapsed ? "justify-center px-0 w-8 mx-auto" : "px-2.5",
                          active
                            ? "bg-white/[0.07] text-foreground font-medium"
                            : "text-sidebar-foreground/55 hover:bg-white/[0.04] hover:text-sidebar-foreground font-normal"
                        )}
                      >
                        {active && !sidebarCollapsed && (
                          <span className="absolute left-0 inset-y-[6px] w-[2px] rounded-r-full bg-primary" />
                        )}
                        <Icon className={cn(
                          "h-[15px] w-[15px] shrink-0 transition-colors",
                          active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                        )} />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    )

                    if (sidebarCollapsed) {
                      return (
                        <Tooltip key={item.href} delayDuration={0}>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                        </Tooltip>
                      )
                    }
                    return <div key={item.href}>{link}</div>
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 border-t border-sidebar-border">
          {/* Settings */}
          {!sidebarCollapsed ? (
            <div className="px-2 py-1.5">
              <Link
                href="/settings"
                className={cn(
                  "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-all duration-100",
                  pathname === "/settings"
                    ? "bg-white/[0.07] text-foreground font-medium"
                    : "text-sidebar-foreground/55 hover:bg-white/[0.04] hover:text-sidebar-foreground font-normal"
                )}
              >
                {pathname === "/settings" && (
                  <span className="absolute left-0 inset-y-[6px] w-[2px] rounded-r-full bg-primary" />
                )}
                <Settings className={cn(
                  "h-[15px] w-[15px] shrink-0",
                  pathname === "/settings" ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                )} />
                <span>Settings</span>
              </Link>
            </div>
          ) : (
            <div className="flex justify-center py-1.5">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href="/settings"
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      pathname === "/settings"
                        ? "bg-white/[0.07] text-primary"
                        : "text-sidebar-foreground/40 hover:bg-white/[0.04] hover:text-sidebar-foreground"
                    )}
                  >
                    <Settings className="h-[15px] w-[15px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Settings</TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Workspace + collapse toggle */}
          <div className={cn(
            "flex items-center border-t border-sidebar-border px-3 py-2",
            sidebarCollapsed ? "justify-center" : "justify-between gap-2"
          )}>
            {!sidebarCollapsed && (
              <button className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-xs text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/20">
                  <Cpu className="h-3 w-3 text-violet-400" />
                </span>
                <span className="truncate">Default Workspace</span>
                <ChevronDown className="h-3 w-3 shrink-0 opacity-40" />
              </button>
            )}
            <button
              onClick={toggleSidebar}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/30 transition-colors hover:bg-white/[0.04] hover:text-sidebar-foreground/60"
            >
              {sidebarCollapsed
                ? <ChevronRight className="h-3.5 w-3.5" />
                : <ChevronLeft className="h-3.5 w-3.5" />
              }
            </button>
          </div>

          {/* System status */}
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 border-t border-sidebar-border px-4 py-2">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                {up && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />}
                <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", up ? "bg-emerald-400" : "bg-red-400")} />
              </span>
              <span className="text-[11px] text-sidebar-foreground/40">
                {up ? "All systems online" : "Degraded"}
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
