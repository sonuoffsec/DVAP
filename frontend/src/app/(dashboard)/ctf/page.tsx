"use client"

import Link from "next/link"
import { Flag, Lock, ArrowRight, Trophy } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { useLabs } from "@/hooks/useLabs"
import { DifficultyBadge } from "@/components/labs/DifficultyBadge"
import { cn } from "@/lib/utils"

const DIFF_ORDER = ["beginner", "intermediate", "advanced", "expert"] as const

export default function CTFPage() {
  const { data: labs, isLoading } = useLabs()

  const totalChallenges = labs?.reduce((sum, lab) => sum + lab.challenge_count, 0) ?? 0

  const byDiff = DIFF_ORDER.map(d => ({
    diff: d,
    count: labs?.filter(l => l.difficulty === d).reduce((s, l) => s + l.challenge_count, 0) ?? 0,
  }))

  const DIFF_STYLES = {
    beginner:     { color: "#4ade80", bg: "bg-emerald-500/10 ring-emerald-500/20", label: "Beginner" },
    intermediate: { color: "#fbbf24", bg: "bg-amber-500/10 ring-amber-500/20",    label: "Intermediate" },
    advanced:     { color: "#fb923c", bg: "bg-orange-500/10 ring-orange-500/20",   label: "Advanced" },
    expert:       { color: "#f87171", bg: "bg-red-500/10 ring-red-500/20",         label: "Expert" },
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="CTF Challenges"
        description={`${totalChallenges} challenges across ${labs?.length ?? 0} labs`}
      />

      {/* Difficulty breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {byDiff.map(({ diff, count }) => {
          const s = DIFF_STYLES[diff]
          return (
            <div key={diff} className={cn("surface rounded-xl p-4 text-center ring-1", s.bg)}>
              <p className="text-2xl font-extrabold" style={{ color: s.color }}>{count}</p>
              <p className="mt-1 text-[11px] font-medium" style={{ color: s.color }}>{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Lab challenge cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {labs?.map((lab) => (
            <div key={lab.id} className="group surface rounded-xl overflow-hidden transition-all hover:border-white/10 hover:shadow-[0_0_20px_hsl(var(--primary)/0.06)]">
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-[13px] font-semibold text-foreground leading-snug group-hover:text-violet-300 transition-colors">
                    {lab.name}
                  </h3>
                  <DifficultyBadge difficulty={lab.difficulty} />
                </div>

                <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-violet-400" />
                    <span><strong className="text-foreground">{lab.challenge_count}</strong> flag{lab.challenge_count !== 1 ? "s" : ""}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground/50">
                    <Lock className="h-3 w-3" />
                    Lab required
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
                <span className="text-[10px] text-muted-foreground/40 mono">{lab.slug}</span>
                <Link
                  href={`/labs/${lab.slug}`}
                  className="flex items-center gap-1 rounded-lg bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-400 ring-1 ring-violet-500/20 transition-all hover:bg-violet-500/20 hover:text-violet-300"
                >
                  Open Lab
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {labs?.length === 0 && !isLoading && (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
          <Trophy className="h-8 w-8 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">No labs available</p>
        </div>
      )}
    </div>
  )
}
