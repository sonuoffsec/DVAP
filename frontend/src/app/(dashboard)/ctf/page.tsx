"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Flag, Lock, CheckCircle2, ChevronDown, ChevronRight,
  ArrowRight, Trophy, Target,
} from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { DifficultyBadge } from "@/components/labs/DifficultyBadge"
import { ctfApi } from "@/lib/api"
import type { CtfScoreboard, CtfLab, LabDifficulty } from "@/types"
import { cn } from "@/lib/utils"

const DIFF_ORDER: LabDifficulty[] = ["beginner", "intermediate", "advanced", "expert"]

const DIFF_STYLES: Record<LabDifficulty, { color: string; bg: string; label: string }> = {
  beginner:     { color: "#4ade80", bg: "bg-emerald-500/10 ring-emerald-500/20", label: "Beginner" },
  intermediate: { color: "#fbbf24", bg: "bg-amber-500/10 ring-amber-500/20",    label: "Intermediate" },
  advanced:     { color: "#fb923c", bg: "bg-orange-500/10 ring-orange-500/20",   label: "Advanced" },
  expert:       { color: "#f87171", bg: "bg-red-500/10 ring-red-500/20",         label: "Expert" },
}

function LabChallengeCard({ lab }: { lab: CtfLab }) {
  const [expanded, setExpanded] = useState(false)
  const s = DIFF_STYLES[lab.difficulty]
  const pct = lab.total_count ? (lab.captured_count / lab.total_count) * 100 : 0
  const complete = lab.captured_count === lab.total_count && lab.total_count > 0

  return (
    <div className={cn(
      "surface rounded-xl overflow-hidden transition-all",
      complete && "ring-1 ring-emerald-500/20 shadow-[0_0_16px_hsl(var(--success)/0.06)]"
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-[13px] font-semibold text-foreground">{lab.name}</h3>
              <DifficultyBadge difficulty={lab.difficulty} />
              {complete && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  Complete
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[15px] font-extrabold leading-none" style={{ color: s.color }}>
              {lab.earned_points}
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-0.5">
              / {lab.total_points} pts
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/55">
            <span className="flex items-center gap-1.5">
              <Flag className="h-3 w-3 text-violet-400/70" />
              {lab.captured_count}/{lab.total_count} flags
            </span>
            <span className="mono">{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: complete
                  ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                  : `linear-gradient(90deg, ${s.color}70, ${s.color})`,
                boxShadow: pct > 0 ? `0 0 6px ${s.color}50` : "none",
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-border/40">
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[11px] text-muted-foreground/45">
            {expanded ? "Hide challenges" : `${lab.total_count} challenge${lab.total_count !== 1 ? "s" : ""}`}
          </span>
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/35" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/35" />
          }
        </button>

        {expanded && (
          <div className="divide-y divide-border/25 px-4 pb-2">
            {lab.challenges.map(ch => (
              <div key={ch.id} className="flex items-center gap-3 py-2.5">
                {ch.captured
                  ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  : <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/20" />
                }
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[12px] font-medium truncate",
                    ch.captured ? "text-muted-foreground/40 line-through" : "text-foreground"
                  )}>
                    {ch.name}
                  </p>
                </div>
                <DifficultyBadge difficulty={ch.difficulty} />
                <span className={cn(
                  "shrink-0 text-[11px] font-bold mono w-8 text-right",
                  ch.captured ? "text-emerald-400" : "text-muted-foreground/35"
                )}>
                  {ch.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border/40 px-4 py-2.5">
        <Link
          href={`/labs/${lab.slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-400 ring-1 ring-violet-500/20 transition-all hover:bg-violet-500/20 hover:text-violet-300"
        >
          Open Lab
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

export default function CTFPage() {
  const [diffFilter, setDiffFilter] = useState<LabDifficulty | null>(null)
  const [hideComplete, setHideComplete] = useState(false)

  const { data: scoreboard, isLoading } = useQuery({
    queryKey: ["ctf-scoreboard"],
    queryFn: ctfApi.scoreboard,
    refetchInterval: 15_000,
  })

  const filtered = useMemo(() => {
    if (!scoreboard) return []
    return scoreboard.labs.filter(l => {
      if (diffFilter && l.difficulty !== diffFilter) return false
      if (hideComplete && l.captured_count === l.total_count && l.total_count > 0) return false
      return true
    })
  }, [scoreboard, diffFilter, hideComplete])

  const byDiff = useMemo((): Record<LabDifficulty, CtfLab[]> => {
    const empty = { beginner: [], intermediate: [], advanced: [], expert: [] } as Record<LabDifficulty, CtfLab[]>
    if (!scoreboard) return empty
    return scoreboard.labs.reduce((acc, l) => {
      acc[l.difficulty].push(l)
      return acc
    }, empty)
  }, [scoreboard])

  const pct = scoreboard?.total_points
    ? Math.round((scoreboard.earned_points / scoreboard.total_points) * 100)
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="CTF Challenges"
        description={scoreboard
          ? `${scoreboard.captured_count}/${scoreboard.total_count} flags · ${scoreboard.earned_points.toLocaleString()} pts earned`
          : "Loading challenges..."
        }
      />

      {/* Score summary */}
      {scoreboard && (
        <div className="surface rounded-xl p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <Trophy className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground leading-none">
                    {scoreboard.earned_points.toLocaleString()}
                  </span>
                  <span className="text-[13px] text-muted-foreground/50">
                    / {scoreboard.total_points.toLocaleString()} pts
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground/60">
                  {scoreboard.captured_count} of {scoreboard.total_count} flags captured
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {DIFF_ORDER.map(d => {
                const labs = byDiff[d]
                const captured = labs.reduce((s, l) => s + l.captured_count, 0)
                const total = labs.reduce((s, l) => s + l.total_count, 0)
                if (!total) return null
                const ds = DIFF_STYLES[d]
                return (
                  <div key={d} className={cn("rounded-xl p-3 text-center ring-1 min-w-[68px]", ds.bg)}>
                    <p className="text-[16px] font-extrabold leading-none" style={{ color: ds.color }}>
                      {captured}/{total}
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium" style={{ color: ds.color }}>{ds.label}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/55">
              <span>Overall progress</span>
              <span className="mono">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct === 100
                    ? "linear-gradient(90deg, #4ade80, #22d3ee)"
                    : "linear-gradient(90deg, #7c3aed, #818cf8)",
                  boxShadow: pct > 0 ? "0 0 8px #7c3aed60" : "none",
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setDiffFilter(null)}
          className={cn(
            "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
            !diffFilter
              ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
              : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
          )}
        >
          All Labs
        </button>
        {DIFF_ORDER.map(d => {
          const active = diffFilter === d
          const ds = DIFF_STYLES[d]
          return (
            <button
              key={d}
              onClick={() => setDiffFilter(active ? null : d)}
              className={cn(
                "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? ""
                  : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
              )}
              style={active ? {
                color: ds.color,
                background: `${ds.color}15`,
                borderColor: `${ds.color}35`,
              } : {}}
            >
              {ds.label}
            </button>
          )
        })}
        <button
          onClick={() => setHideComplete(v => !v)}
          className={cn(
            "ml-auto rounded-md border px-3 py-1 text-xs font-medium transition-colors",
            hideComplete
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
          )}
        >
          {hideComplete ? "Show All" : "Hide Completed"}
        </button>
      </div>

      {/* Lab grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(lab => (
            <LabChallengeCard key={lab.slug} lab={lab} />
          ))}
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border">
          <Target className="h-8 w-8 text-muted-foreground/20" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">No labs match the current filter</p>
            <button
              onClick={() => { setDiffFilter(null); setHideComplete(false) }}
              className="mt-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
