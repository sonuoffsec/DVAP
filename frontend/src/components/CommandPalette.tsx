"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search, LayoutDashboard, FlaskConical, Flag, Microscope,
  CirclePlay, BarChart2, Boxes, GitBranch, Bug, Shield,
  FileText, Settings, CornerDownLeft, type LucideIcon,
} from "lucide-react"
import { useLabs } from "@/hooks/useLabs"
import { useFindings } from "@/hooks/useFindings"
import { CATEGORY_CONFIG, DIFFICULTY_CONFIG, SEVERITY_CONFIG } from "@/lib/constants"
import { cn } from "@/lib/utils"

type CommandItem = {
  id: string
  group: string
  icon: LucideIcon
  title: string
  subtitle?: string
  action: () => void
}

const NAV_ITEMS = [
  { href: "/overview",      label: "Overview",            icon: LayoutDashboard },
  { href: "/labs",          label: "Labs",                icon: FlaskConical },
  { href: "/ctf",           label: "CTF Challenges",      icon: Flag },
  { href: "/research",      label: "Research Workspace",  icon: Microscope },
  { href: "/attack-replay", label: "Attack Campaigns",    icon: CirclePlay },
  { href: "/benchmarks",    label: "Benchmarks",          icon: BarChart2 },
  { href: "/models",        label: "Model Hub",           icon: Boxes },
  { href: "/threat-models", label: "Threat Models",       icon: GitBranch },
  { href: "/findings",      label: "Findings",            icon: Bug },
  { href: "/soc",           label: "AI-SOC",              icon: Shield },
  { href: "/reports",       label: "Reports",             icon: FileText },
  { href: "/settings",      label: "Settings",            icon: Settings },
] as const

interface Props {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)

  const { data: labs } = useLabs()
  const { data: findings } = useFindings()

  const go = useCallback((href: string) => {
    router.push(href)
    onClose()
  }, [router, onClose])

  // Build flat items list
  const items = useMemo((): CommandItem[] => {
    const nav: CommandItem[] = NAV_ITEMS.map(n => ({
      id: `nav-${n.href}`,
      group: "Navigate",
      icon: n.icon,
      title: n.label,
      action: () => go(n.href),
    }))

    const labItems: CommandItem[] = (labs ?? []).map(lab => ({
      id: `lab-${lab.id}`,
      group: "Labs",
      icon: FlaskConical,
      title: lab.name,
      subtitle: `${DIFFICULTY_CONFIG[lab.difficulty].label} · ${CATEGORY_CONFIG[lab.category].label}`,
      action: () => go(`/labs/${lab.slug}`),
    }))

    const findingItems: CommandItem[] = (findings ?? []).slice(0, 20).map(f => ({
      id: `finding-${f.id}`,
      group: "Findings",
      icon: Bug,
      title: f.title,
      subtitle: `${SEVERITY_CONFIG[f.severity].label} · ${f.status.replace(/_/g, " ")}`,
      action: () => go("/findings"),
    }))

    const q = query.trim().toLowerCase()
    if (!q) return nav

    return [...nav, ...labItems, ...findingItems].filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q)
    )
  }, [query, labs, findings, go])

  // Group items with stable global index
  const grouped = useMemo(() => {
    const map = new Map<string, (CommandItem & { idx: number })[]>()
    items.forEach((item, idx) => {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)!.push({ ...item, idx })
    })
    return Array.from(map.entries())
  }, [items])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("")
      setSelected(0)
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  // Reset selection on query change
  useEffect(() => { setSelected(0) }, [query])

  // Scroll selected into view
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [selected])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)) }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === "Enter" && items[selected]) items[selected].action()
    }
    document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [open, items, selected, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[14vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative mx-4 w-full max-w-[580px] overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
        style={{ boxShadow: "0 0 0 1px hsl(var(--border)), 0 40px 100px rgba(0,0,0,0.55)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search row */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search labs, findings, pages..."
            className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/35 outline-none"
          />
          <kbd className="rounded border border-border bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground/35 mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto py-1.5 overscroll-contain">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <Search className="h-6 w-6 text-muted-foreground/20" />
              <p className="text-[13px] text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            grouped.map(([group, groupItems]) => (
              <div key={group}>
                <p className="px-4 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/35">
                  {group}
                </p>
                {groupItems.map(item => {
                  const Icon = item.icon
                  const isActive = selected === item.idx
                  return (
                    <button
                      key={item.id}
                      data-idx={item.idx}
                      onClick={item.action}
                      onMouseEnter={() => setSelected(item.idx)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        isActive ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"
                      )}
                    >
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        isActive
                          ? "border-primary/30 bg-primary/15"
                          : "border-border/60 bg-white/[0.03]"
                      )}>
                        <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : "text-muted-foreground/55")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[13px]", isActive ? "font-medium text-foreground" : "text-foreground/75")}>
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="text-[11px] text-muted-foreground/45">{item.subtitle}</p>
                        )}
                      </div>
                      {isActive && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-border bg-white/[0.015] px-4 py-2">
          {[
            { key: "↑↓", label: "navigate" },
            { key: "↵",  label: "open" },
            { key: "esc", label: "close" },
          ].map(h => (
            <span key={h.key} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/35">
              <kbd className="rounded border border-border bg-white/[0.04] px-1.5 py-px text-[9px] mono">{h.key}</kbd>
              {h.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
