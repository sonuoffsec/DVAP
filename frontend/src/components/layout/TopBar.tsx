"use client"

import { useRef, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import {
  Bell, Search, Settings, ChevronDown, Menu,
  AlertTriangle, CheckCircle2, FlaskConical, Flag,
  BarChart2, Activity, X,
} from "lucide-react"
import { useHealth } from "@/hooks/useHealth"
import { useAppStore } from "@/store"
import { CommandPalette } from "@/components/CommandPalette"
import { TimeAgo } from "@/components/ui/time-ago"
import { cn } from "@/lib/utils"
import Link from "next/link"

const http = axios.create({ baseURL: "/api/v1" })

type ServiceEntry = {
  key: string
  label: string
  up: boolean
  version?: string | null
  detail?: string | null
}

const EVENT_ICON: Record<string, any> = {
  injection_detected:    AlertTriangle,
  anomaly_detected:      AlertTriangle,
  flag_failed:           AlertTriangle,
  lab_launched:          FlaskConical,
  lab_stopped:           FlaskConical,
  flag_captured:         Flag,
  benchmark_completed:   BarChart2,
  benchmark_started:     BarChart2,
  model_queried:         Activity,
  research_session:      Activity,
}

const EVENT_COLOR: Record<string, string> = {
  injection_detected:  "text-red-400",
  anomaly_detected:    "text-orange-400",
  flag_failed:         "text-orange-400",
  lab_launched:        "text-emerald-400",
  lab_stopped:         "text-zinc-400",
  flag_captured:       "text-violet-400",
  benchmark_completed: "text-cyan-400",
  benchmark_started:   "text-cyan-400",
  model_queried:       "text-blue-400",
  research_session:    "text-amber-400",
}

const EVENT_LABEL: Record<string, string> = {
  injection_detected:  "Injection Detected",
  anomaly_detected:    "Anomaly Detected",
  flag_failed:         "Flag Attempt Failed",
  lab_launched:        "Lab Launched",
  lab_stopped:         "Lab Stopped",
  flag_captured:       "Flag Captured",
  benchmark_completed: "Benchmark Completed",
  benchmark_started:   "Benchmark Started",
  model_queried:       "Model Queried",
  research_session:    "Research Session",
}

export function TopBar() {
  const { data: health } = useHealth()
  const allUp = health?.status === "healthy"
  const { toggleMobileSidebar } = useAppStore()

  const [cmdOpen, setCmdOpen]         = useState(false)
  const [activeService, setActiveService] = useState<string | null>(null)
  const [userMenuOpen, setUserMenuOpen]   = useState(false)
  const [notifOpen, setNotifOpen]         = useState(false)

  const serviceRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef    = useRef<HTMLDivElement>(null)

  const { data: events } = useQuery({
    queryKey: ["topbar-events"],
    queryFn: () => http.get("/soc/events", { params: { limit: 8 } }).then(r => r.data),
    refetchInterval: 15_000,
  })

  const notifCount = (events ?? []).filter((e: any) =>
    ["injection_detected", "anomaly_detected", "flag_captured", "flag_failed"].includes(e.event_type)
  ).length

  // Ctrl+K / Cmd+K
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setCmdOpen(o => !o)
      }
    }
    document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [])

  // Click outside handlers
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) setActiveService(null)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const services: ServiceEntry[] = health ? [
    { key: "postgres", label: "postgres", up: health.services.postgres.status === "up", version: health.services.postgres.version ?? null },
    { key: "redis",    label: "redis",    up: health.services.redis.status === "up" },
    { key: "qdrant",   label: "qdrant",   up: health.services.qdrant?.status === "up", version: health.services.qdrant?.version ?? null },
    { key: "ollama",   label: "ollama",   up: health.services.ollama.status === "up",
      detail: health.services.ollama.model_count != null
        ? `${health.services.ollama.model_count} model${health.services.ollama.model_count !== 1 ? "s" : ""} loaded`
        : null },
  ] : []

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-3 sm:px-5 gap-2 sm:gap-4">

        {/* Mobile hamburger */}
        <button
          onClick={toggleMobileSidebar}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.03] text-muted-foreground/60 transition-all hover:border-primary/30 hover:text-primary lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Search trigger */}
        <div className="flex-1 max-w-xs sm:max-w-md">
          <button
            onClick={() => setCmdOpen(true)}
            className="relative flex h-8 w-full items-center gap-2 rounded-xl border border-border bg-white/[0.03] px-3 text-left transition-colors hover:border-border/80 hover:bg-white/[0.05]"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
            <span className="flex-1 truncate text-sm text-muted-foreground/35 hidden sm:block">Search labs, findings, models...</span>
            <span className="flex-1 truncate text-sm text-muted-foreground/35 sm:hidden">Search...</span>
            <kbd className="hidden sm:block rounded border border-border bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/30 mono">⌘K</kbd>
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 sm:gap-2">

          {/* Service status */}
          {services.length > 0 && (
            <div ref={serviceRef} className="hidden xl:flex items-center gap-px rounded-xl border border-border bg-white/[0.02] px-2 py-1.5">
              {services.map((s, i) => (
                <div key={s.key} className="relative flex items-center">
                  {i > 0 && <span className="mx-2 h-3 w-px bg-border" />}
                  <button
                    onClick={() => setActiveService(activeService === s.key ? null : s.key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] transition-colors",
                      activeService === s.key ? "bg-white/[0.06] text-foreground" : "text-muted-foreground/60 hover:text-foreground"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.up ? "bg-emerald-400 shadow-[0_0_4px_#4ade80]" : "bg-red-400 shadow-[0_0_4px_#f87171]")} />
                    <span className="mono">{s.label}</span>
                  </button>
                  {activeService === s.key && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 w-44 rounded-xl border border-border bg-popover p-3 shadow-2xl">
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-l border-t border-border bg-popover" />
                      <div className="space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground capitalize">{s.label}</span>
                          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", s.up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                            {s.up ? "Online" : "Offline"}
                          </span>
                        </div>
                        <div className="border-t border-border/50 pt-2 space-y-1.5 text-muted-foreground">
                          {s.version && <div className="flex justify-between"><span>Version</span><span className="mono text-foreground">{s.version}</span></div>}
                          {s.detail  && <div className="flex justify-between"><span>Models</span><span className="text-foreground">{s.detail}</span></div>}
                          <div className="flex justify-between"><span>Health</span><span className={s.up ? "text-emerald-400" : "text-red-400"}>{s.up ? "Healthy" : "Down"}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* All Systems badge */}
          <div className={cn(
            "hidden 2xl:flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11px] font-medium",
            allUp ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-400" : "border-red-500/20 bg-red-500/8 text-red-400"
          )}>
            <span className="relative flex h-1.5 w-1.5">
              {allUp && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />}
              <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", allUp ? "bg-emerald-400" : "bg-red-400")} />
            </span>
            {allUp ? "All Systems Online" : "Degraded"}
          </div>

          {/* Compact status dot */}
          <div
            className={cn("flex xl:hidden h-2 w-2 rounded-full", allUp ? "bg-emerald-400 shadow-[0_0_6px_#4ade80]" : "bg-red-400 shadow-[0_0_6px_#f87171]")}
            title={allUp ? "All systems online" : "Degraded"}
          />

          <div className="hidden sm:block h-4 w-px bg-border" />

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
                notifOpen
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border bg-white/[0.03] text-muted-foreground/60 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              )}
            >
              <Bell className="h-3.5 w-3.5" />
              {notifCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold text-white">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-80 rounded-xl border border-border bg-popover shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-[13px] font-semibold text-foreground">Recent Activity</span>
                    {notifCount > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-px text-[10px] font-medium text-primary">
                        {notifCount} alert{notifCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setNotifOpen(false)} className="text-muted-foreground/40 hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Event list */}
                <div className="max-h-[320px] overflow-y-auto">
                  {!events || events.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <CheckCircle2 className="h-6 w-6 text-muted-foreground/20" />
                      <p className="text-[12px] text-muted-foreground">No recent activity</p>
                      <p className="text-[11px] text-muted-foreground/50">Launch a lab to generate events</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {events.map((e: any) => {
                        const Icon = EVENT_ICON[e.event_type] ?? Activity
                        const color = EVENT_COLOR[e.event_type] ?? "text-muted-foreground"
                        const label = EVENT_LABEL[e.event_type] ?? e.event_type
                        return (
                          <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                            <div className={cn("mt-0.5 shrink-0", color)}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={cn("text-[12px] font-medium", color)}>{label}</p>
                              <p className="text-[11px] text-muted-foreground/55 truncate">{e.title}</p>
                            </div>
                            <TimeAgo date={e.created_at} className="shrink-0 text-[10px] text-muted-foreground/35 mono" />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-4 py-2.5">
                  <Link
                    href="/soc"
                    onClick={() => setNotifOpen(false)}
                    className="flex items-center justify-center text-[11px] text-primary hover:text-primary/80 transition-colors"
                  >
                    View full AI-SOC console →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-xl border px-2 transition-all",
                userMenuOpen
                  ? "border-primary/30 bg-primary/10 text-foreground"
                  : "border-border bg-white/[0.03] text-muted-foreground/60 hover:border-primary/30 hover:bg-primary/10 hover:text-foreground"
              )}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[9px] font-bold text-white">
                U
              </div>
              <ChevronDown className={cn("h-3 w-3 transition-transform hidden sm:block", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 w-48 rounded-xl border border-border bg-popover p-1 shadow-2xl">
                <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border mb-1">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-bold text-white">
                    U
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground">Local User</p>
                    <p className="text-[10px] text-muted-foreground/50 mono">dvap-local</p>
                  </div>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                >
                  <Settings className="h-3.5 w-3.5" /> Settings
                </Link>
                <div className="mt-1 border-t border-border px-3 py-2">
                  <p className="text-[10px] text-muted-foreground/35 mono">DVAP v1.0.0 · Local</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </header>
    </>
  )
}
