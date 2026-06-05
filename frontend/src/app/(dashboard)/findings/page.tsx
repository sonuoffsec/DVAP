"use client"

import { useState, useMemo } from "react"
import { Plus, Bug, X, Loader2, Shield, AlertTriangle, AlertCircle, Info, ChevronDown } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFindings, useCreateFinding } from "@/hooks/useFindings"
import { SEVERITY_CONFIG } from "@/lib/constants"
import { TimeAgo } from "@/components/ui/time-ago"
import type { FindingSeverity, FindingStatus } from "@/types"
import { cn } from "@/lib/utils"

const SEVERITIES = ["critical", "high", "medium", "low", "informational"] as FindingSeverity[]
const STATUSES: { value: FindingStatus; label: string }[] = [
  { value: "open",          label: "Open" },
  { value: "in_review",     label: "In Review" },
  { value: "mitigated",     label: "Mitigated" },
  { value: "accepted",      label: "Accepted" },
  { value: "false_positive",label: "False Positive" },
]

const SEV_DOT: Record<FindingSeverity, string> = {
  critical:      "bg-red-500",
  high:          "bg-orange-500",
  medium:        "bg-amber-500",
  low:           "bg-blue-500",
  informational: "bg-zinc-500",
}

const SEV_ROW: Record<FindingSeverity, string> = {
  critical:      "border-l-red-500/60",
  high:          "border-l-orange-500/60",
  medium:        "border-l-amber-500/60",
  low:           "border-l-blue-500/60",
  informational: "border-l-zinc-600/60",
}

const STATUS_STYLE: Record<FindingStatus, string> = {
  open:           "bg-red-500/10 text-red-400 border-red-500/20",
  in_review:      "bg-amber-500/10 text-amber-400 border-amber-500/20",
  mitigated:      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  accepted:       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  false_positive: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
}

function CreateFindingModal({ onClose }: { onClose: () => void }) {
  const create = useCreateFinding()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [severity, setSeverity] = useState<FindingSeverity>("medium")

  async function handleSubmit() {
    if (!title.trim()) return
    await create.mutateAsync({ title: title.trim(), description: description.trim(), severity })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="surface rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[15px] font-semibold">New Finding</h2>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/[0.05] hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="section-label block mb-1.5">Title</label>
            <Input placeholder="e.g. System prompt extracted via role injection" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="section-label block mb-1.5">Severity</label>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITIES.map(s => (
                <button key={s} onClick={() => setSeverity(s)} className={cn("rounded-lg border px-2.5 py-1 text-xs font-medium transition-all", severity === s ? SEVERITY_CONFIG[s].bgColor : "border-border text-muted-foreground hover:border-white/15")}>
                  {SEVERITY_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="section-label block mb-1.5">Description</label>
            <textarea
              placeholder="Steps to reproduce, impact, evidence..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none resize-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!title.trim() || create.isPending}>
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create Finding
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FindingsPage() {
  const [activeSeverity, setActiveSeverity] = useState<FindingSeverity | null>(null)
  const [activeStatus, setActiveStatus] = useState<FindingStatus | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: allFindings, isLoading } = useFindings()

  const findings = useMemo(() => {
    if (!allFindings) return []
    return allFindings.filter(f => {
      if (activeSeverity && f.severity !== activeSeverity) return false
      if (activeStatus && f.status !== activeStatus) return false
      return true
    })
  }, [allFindings, activeSeverity, activeStatus])

  const stats = useMemo(() => ({
    total:    allFindings?.length ?? 0,
    critical: allFindings?.filter(f => f.severity === "critical").length ?? 0,
    high:     allFindings?.filter(f => f.severity === "high").length ?? 0,
    open:     allFindings?.filter(f => f.status === "open").length ?? 0,
  }), [allFindings])

  return (
    <div className="space-y-5">
      {showCreate && <CreateFindingModal onClose={() => setShowCreate(false)} />}

      <PageHeader
        title="Research Findings"
        description="Findings generated from lab experiments, flag captures, and red team exercises"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Finding
          </Button>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",    value: stats.total,    icon: Bug,           color: "text-foreground" },
          { label: "Critical", value: stats.critical, icon: AlertTriangle, color: "text-red-400" },
          { label: "High",     value: stats.high,     icon: AlertCircle,   color: "text-orange-400" },
          { label: "Open",     value: stats.open,     icon: Info,          color: "text-amber-400" },
        ].map(s => (
          <div key={s.label} className="surface rounded-xl p-3.5 flex items-center gap-3">
            <s.icon className={cn("h-4 w-4 shrink-0", s.color)} />
            <div>
              <p className={cn("text-xl font-bold leading-none", s.color)}>{s.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {SEVERITIES.map(s => (
            <button
              key={s}
              onClick={() => setActiveSeverity(activeSeverity === s ? null : s)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                activeSeverity === s ? SEVERITY_CONFIG[s].bgColor : "border-border text-muted-foreground hover:border-white/15 hover:text-foreground"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", SEV_DOT[s])} />
              {SEVERITY_CONFIG[s].label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setActiveStatus(activeStatus === s.value ? null : s.value)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-medium transition-all",
                activeStatus === s.value ? STATUS_STYLE[s.value] : "border-border text-muted-foreground hover:border-white/15 hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {(activeSeverity || activeStatus) && (
          <button
            onClick={() => { setActiveSeverity(null); setActiveStatus(null) }}
            className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}

        <span className="ml-auto text-[11px] text-muted-foreground/50">
          {findings.length} finding{findings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-card border border-border" />
          ))}
        </div>
      ) : findings.length > 0 ? (
        <div className="surface rounded-xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[20px_1fr_auto_auto] lg:grid-cols-[20px_1fr_200px_120px_100px] gap-x-4 border-b border-border px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
            <span />
            <span>Title</span>
            <span className="hidden lg:block">Category</span>
            <span>Status</span>
            <span className="hidden lg:block text-right">Date</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border/40">
            {findings.map(finding => (
              <div key={finding.id}>
                <button
                  onClick={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
                  className={cn(
                    "w-full grid grid-cols-[20px_1fr_auto_auto] lg:grid-cols-[20px_1fr_200px_120px_100px] gap-x-4 items-center border-l-2 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]",
                    SEV_ROW[finding.severity]
                  )}
                >
                  <ChevronDown className={cn("h-3 w-3 text-muted-foreground/30 transition-transform shrink-0", expandedId === finding.id && "rotate-180")} />

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{finding.title}</p>
                    {finding.attack_vector && (
                      <p className="truncate text-[11px] text-muted-foreground/50 mono">{finding.attack_vector}</p>
                    )}
                  </div>

                  <div className="hidden lg:flex flex-wrap gap-1">
                    {finding.owasp_categories.slice(0, 2).map(cat => (
                      <span key={cat} className="rounded border border-white/8 bg-white/[0.04] px-1.5 py-px text-[10px] text-muted-foreground mono">{cat}</span>
                    ))}
                    {finding.owasp_categories.length > 2 && (
                      <span className="text-[10px] text-muted-foreground/40">+{finding.owasp_categories.length - 2}</span>
                    )}
                  </div>

                  <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium w-fit", STATUS_STYLE[finding.status])}>
                    {STATUSES.find(s => s.value === finding.status)?.label ?? finding.status}
                  </span>

                  <TimeAgo date={finding.created_at} className="hidden lg:block text-[11px] text-muted-foreground/40 mono text-right" />
                </button>

                {/* Expanded detail */}
                {expandedId === finding.id && (
                  <div className="border-l-2 border-border/30 bg-white/[0.015] px-8 py-4 text-[12px]">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {finding.description && (
                        <div>
                          <p className="section-label mb-1">Description</p>
                          <p className="text-muted-foreground leading-relaxed">{finding.description}</p>
                        </div>
                      )}
                      {finding.remediation && (
                        <div>
                          <p className="section-label mb-1">Remediation</p>
                          <p className="text-muted-foreground leading-relaxed">{finding.remediation}</p>
                        </div>
                      )}
                      {finding.mitre_atlas.length > 0 && (
                        <div>
                          <p className="section-label mb-1">MITRE ATLAS</p>
                          <div className="flex flex-wrap gap-1">
                            {finding.mitre_atlas.map(t => (
                              <span key={t} className="rounded border border-violet-500/20 bg-violet-500/10 px-1.5 py-px text-[10px] text-violet-400 mono">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {finding.cwe.length > 0 && (
                        <div>
                          <p className="section-label mb-1">CWE</p>
                          <div className="flex flex-wrap gap-1">
                            {finding.cwe.map(c => (
                              <span key={c} className="rounded border border-blue-500/20 bg-blue-500/10 px-1.5 py-px text-[10px] text-blue-400 mono">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
          <Bug className="h-8 w-8 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">No findings yet</p>
          <p className="text-xs text-muted-foreground/50">Complete labs to auto-generate findings, or create one manually</p>
        </div>
      )}
    </div>
  )
}
