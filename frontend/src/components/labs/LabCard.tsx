import Link from "next/link"
import {
  Target, Flag, Play, Clock,
  Terminal, Brain, Database, Wrench, Plug, Globe, Network,
  Landmark, Package, Bot, ArrowUpFromLine, ShieldAlert, Users,
  Stethoscope, Code2, type LucideIcon,
} from "lucide-react"
import { DifficultyBadge } from "./DifficultyBadge"
import { truncate, cn } from "@/lib/utils"
import { CATEGORY_CONFIG } from "@/lib/constants"
import type { LabSummary } from "@/types"

const ICON_MAP: Record<string, LucideIcon> = {
  Terminal, Brain, Database, Wrench, Plug, Globe, Network,
  Landmark, Package, Bot, ArrowUpFromLine, ShieldAlert, Users,
  Stethoscope, Code2,
}

const CATEGORY_COLORS: Record<string, string> = {
  prompt_injection:   "bg-violet-500/15 text-violet-400",
  memory_poisoning:   "bg-purple-500/15 text-purple-400",
  rag_poisoning:      "bg-blue-500/15 text-blue-400",
  tool_injection:     "bg-amber-500/15 text-amber-400",
  mcp_security:       "bg-cyan-500/15 text-cyan-400",
  browser_agent:      "bg-indigo-500/15 text-indigo-400",
  multi_agent:        "bg-emerald-500/15 text-emerald-400",
  banking:            "bg-green-500/15 text-green-400",
  supply_chain:       "bg-orange-500/15 text-orange-400",
  autonomous_agent:   "bg-red-500/15 text-red-400",
  data_exfiltration:  "bg-rose-500/15 text-rose-400",
  identity_trust:     "bg-yellow-500/15 text-yellow-500",
  multi_tenant:       "bg-teal-500/15 text-teal-400",
  healthcare:         "bg-pink-500/15 text-pink-400",
  developer_platform: "bg-sky-500/15 text-sky-400",
}

const TIME_ESTIMATE: Record<string, string> = {
  beginner:     "~30 min",
  intermediate: "~1 hr",
  advanced:     "~2 hrs",
  expert:       "3+ hrs",
}

interface LabCardProps {
  lab: LabSummary
}

export function LabCard({ lab }: LabCardProps) {
  const categoryConfig = CATEGORY_CONFIG[lab.category]
  const Icon = ICON_MAP[categoryConfig?.icon ?? "Terminal"] ?? Terminal
  const iconColor = CATEGORY_COLORS[lab.category] ?? "bg-white/10 text-white/60"

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-px hover:border-white/[0.12] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">

      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-semibold leading-snug text-foreground group-hover:text-primary transition-colors truncate">
                {lab.name}
              </h3>
              <DifficultyBadge difficulty={lab.difficulty} />
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground/50">
              {categoryConfig?.label ?? lab.category}
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 pb-3">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {truncate(lab.description, 110)}
        </p>

        {lab.objectives.length > 0 && (
          <div className="mt-3 space-y-1">
            {lab.objectives.slice(0, 2).map((obj, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground/65">
                <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-primary/40" />
                <span className="leading-relaxed">{obj}</span>
              </div>
            ))}
            {lab.objectives.length > 2 && (
              <p className="pl-3 text-[11px] text-muted-foreground/35">
                +{lab.objectives.length - 2} more
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50">
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            {lab.objectives.length}
          </span>
          <span className="flex items-center gap-1">
            <Flag className="h-3 w-3" />
            {lab.challenge_count}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {TIME_ESTIMATE[lab.difficulty] ?? "—"}
          </span>
        </div>
        <Link
          href={`/labs/${lab.slug}`}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
        >
          <Play className="h-2.5 w-2.5" />
          Launch
        </Link>
      </div>
    </div>
  )
}
