"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo, type ComponentType, type CSSProperties } from "react"
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts"
import Link from "next/link"
import {
  FlaskConical, Flag, BarChart2, Microscope, Cpu, Zap,
  Activity, Play, BookOpen, Target, ArrowUpRight,
  CheckCircle2, Circle, ChevronRight, Bug,
} from "lucide-react"
import { http } from "@/lib/api"
import { useLabStats } from "@/hooks/useLabs"
import { useFindings } from "@/hooks/useFindings"
import { useOllama } from "@/hooks/useHealth"
import { cn } from "@/lib/utils"
import { TimeAgo } from "@/components/ui/time-ago"
import { ClientOnly } from "@/components/ui/client-only"

/* ── Model palette ── */
const MODEL_COLORS: Record<string, { color: string; abbr: string }> = {
  "llama3.2:3b": { color: "#4ade80", abbr: "L3" },
  "llama3.1:8b": { color: "#4ade80", abbr: "L3" },
  "qwen2.5:3b":  { color: "#22d3ee", abbr: "Q2" },
  "qwen2.5:7b":  { color: "#22d3ee", abbr: "Q2" },
  "gemma2:2b":   { color: "#a78bfa", abbr: "G2" },
  "gemma2:9b":   { color: "#a78bfa", abbr: "G2" },
  "mistral:7b":  { color: "#fbbf24", abbr: "MI" },
}
function modelMeta(id: string) {
  return MODEL_COLORS[id] ?? { color: "#94a3b8", abbr: id.slice(0, 2).toUpperCase() }
}
function scoreColor(s: number) {
  if (s >= 80) return "#4ade80"
  if (s >= 60) return "#fbbf24"
  return "#f87171"
}

/* ── Activity event styling ── */
const ACTIVITY_COLOR: Record<string, string> = {
  lab_launched:        "#4ade80",
  lab_stopped:         "#6b7280",
  flag_captured:       "#a78bfa",
  flag_failed:         "#f97316",
  injection_detected:  "#f87171",
  benchmark_started:   "#818cf8",
  benchmark_completed: "#22d3ee",
  model_queried:       "#60a5fa",
  research_session:    "#fbbf24",
  anomaly_detected:    "#fb923c",
}
const ACTIVITY_LABEL: Record<string, string> = {
  lab_launched:        "Lab started",
  lab_stopped:         "Lab stopped",
  flag_captured:       "Flag captured",
  flag_failed:         "Flag attempt",
  injection_detected:  "Injection attempt logged",
  benchmark_started:   "Benchmark started",
  benchmark_completed: "Benchmark completed",
  model_queried:       "Model queried",
  research_session:    "Research session opened",
  anomaly_detected:    "Anomaly logged",
}

/* ── Lab category labels ── */
const CATEGORY_LABEL: Record<string, string> = {
  prompt_injection:   "Prompt Injection",
  memory_poisoning:   "Memory Poisoning",
  rag_poisoning:      "RAG Poisoning",
  tool_injection:     "Tool Injection",
  mcp_security:       "MCP Security",
  browser_agent:      "Browser Agent",
  multi_agent:        "Multi-Agent",
  banking:            "AI Banking",
  supply_chain:       "Supply Chain",
  autonomous_agent:   "Autonomous Agent",
  data_exfiltration:  "Data Exfiltration",
  identity_trust:     "Identity & Trust",
  multi_tenant:       "Multi-Tenant SaaS",
  healthcare:         "AI Healthcare",
  developer_platform: "Developer Platform",
}

/* ── Metric card ── */
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  label: string
  value: string | number
  sub?: string
  color: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="surface rounded-xl p-3.5 flex flex-col gap-3 hover:border-white/10 hover:bg-white/[0.025] transition-all"
    >
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: `${color}18`, boxShadow: `0 0 0 1px ${color}22` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color }} />
      </div>
      <div>
        <div className="text-[22px] font-extrabold leading-none tracking-tight text-foreground">
          {value}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/35 mono mt-0.5">{sub}</p>}
      </div>
    </Link>
  )
}

/* ── Getting started checklist ── */
function GettingStarted({
  hasModels,
  hasLaunched,
  hasBenchmarks,
  hasFlags,
}: {
  hasModels: boolean
  hasLaunched: boolean
  hasBenchmarks: boolean
  hasFlags: boolean
}) {
  const steps = [
    {
      done: hasModels,
      title: "Pull a local model",
      desc: "Download Llama, Qwen, Gemma, or Mistral via Ollama.",
      href: "/models",
      cta: "Model Hub",
    },
    {
      done: hasLaunched,
      title: "Launch your first lab",
      desc: "Start an isolated container and explore a vulnerability class.",
      href: "/labs",
      cta: "Browse Labs",
    },
    {
      done: hasBenchmarks,
      title: "Run a benchmark",
      desc: "Test a model against prompt injection, jailbreak, and data exfiltration suites.",
      href: "/benchmarks",
      cta: "Run Benchmark",
    },
    {
      done: hasFlags,
      title: "Capture a flag",
      desc: "Solve a CTF challenge inside any lab to confirm the attack path.",
      href: "/ctf",
      cta: "CTF Challenges",
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const allDone = doneCount === steps.length

  return (
    <div className="surface rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div>
          <h2 className="text-[13px] font-semibold text-foreground">Getting Started</h2>
          {!allDone && (
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">{doneCount} of {steps.length} complete</p>
          )}
        </div>
        {allDone && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-emerald-500/20">
            Ready
          </span>
        )}
      </div>

      <div className="h-0.5 w-full bg-white/5 shrink-0">
        <div
          className="h-full bg-gradient-to-r from-violet-600 to-indigo-400 transition-all duration-500"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="divide-y divide-border/30">
        {steps.map((step, i) => (
          <Link
            key={i}
            href={step.href}
            className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.025] transition-colors group"
          >
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/20" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-[12px] font-medium leading-snug",
                step.done ? "text-muted-foreground/40 line-through" : "text-foreground"
              )}>
                {step.title}
              </p>
              {!step.done && (
                <p className="mt-0.5 text-[11px] text-muted-foreground/45 leading-relaxed">{step.desc}</p>
              )}
            </div>
            {!step.done && (
              <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-violet-400 group-hover:text-violet-300 transition-colors">
                {step.cta}
                <ChevronRight className="h-3 w-3" />
              </span>
            )}
          </Link>
        ))}
      </div>

      {allDone && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-[11px] text-muted-foreground/50">
            Platform configured.{" "}
            <Link href="/threat-models" className="text-violet-400 hover:text-violet-300 transition-colors">
              Explore threat models
            </Link>{" "}
            or start a{" "}
            <Link href="/research" className="text-violet-400 hover:text-violet-300 transition-colors">
              research session
            </Link>.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Chart tooltip ── */
function ChartTip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-white/8 bg-[hsl(220_35%_9%)] px-3 py-1.5 shadow-xl">
      <p className="text-[10px] text-muted-foreground mono">{label}</p>
      <p className="text-sm font-bold text-violet-300">{payload[0].value}</p>
    </div>
  )
}

/* ── Page ── */
export default function OverviewPage() {
  const { data: stats } = useLabStats()
  const { data: findings } = useFindings()
  const { data: ollama } = useOllama()

  const { data: activityEvents } = useQuery({
    queryKey: ["activity-ov"],
    queryFn: () => http.get("/soc/events", { params: { limit: 25 } }).then(r => r.data),
    refetchInterval: 8_000,
  })
  const { data: benchRuns } = useQuery({
    queryKey: ["bench-ov"],
    queryFn: () => http.get("/benchmarks/runs").then(r => r.data),
    refetchInterval: 20_000,
  })
  const { data: researchSessions } = useQuery({
    queryKey: ["research-sessions-ov"],
    queryFn: () => http.get("/research/sessions").then(r => r.data),
    staleTime: 30_000,
  })

  /* Derived values */
  const totalLabs       = stats?.total ?? 15
  const activeLabs      = stats?.active ?? 0
  const modelsAvailable = ollama?.models?.length ?? 0
  const sessionsCount   = Array.isArray(researchSessions) ? researchSessions.length : 0
  const completedRuns   = (benchRuns ?? []).filter((r: any) => r.status === "completed").length
  const flagsCaptured   = stats?.captured_flags ?? 0
  const totalFlags      = stats?.total_flags ?? 0
  const findingsCount   = findings?.length ?? 0

  /* Model leaderboard */
  const modelLeaderboard = useMemo(() => {
    if (!benchRuns?.length) return []
    const best: Record<string, { model: string; score: number; suite: string; runs: number }> = {}
    for (const run of benchRuns) {
      if (run.status !== "completed" || run.security_score == null) continue
      if (!best[run.model] || run.security_score > best[run.model].score) {
        best[run.model] = { model: run.model, score: run.security_score, suite: run.suite, runs: 0 }
      }
    }
    for (const key of Object.keys(best)) {
      best[key].runs = (benchRuns as any[]).filter(r => r.model === key).length
    }
    return Object.values(best).sort((a, b) => b.score - a.score)
  }, [benchRuns])

  /* Benchmark score trend */
  const scoreTrend = useMemo(() => {
    const done = (benchRuns ?? []).filter((r: any) => r.status === "completed" && r.security_score != null && r.completed_at)
    if (done.length < 2) return null
    const byDay: Record<string, number[]> = {}
    for (const r of done) {
      const d = (r.completed_at as string).slice(0, 10)
      ;(byDay[d] ??= []).push(r.security_score)
    }
    const days = Object.keys(byDay).sort().slice(-7)
    if (days.length < 2) return null
    return days.map(d => ({
      d: d.slice(5).replace("-", "/"),
      v: Math.round(byDay[d].reduce((s, v) => s + v, 0) / byDay[d].length),
    }))
  }, [benchRuns])

  /* Getting started state */
  const hasModels     = modelsAvailable > 0
  const hasLaunched   = (stats?.ever_used ?? 0) > 0
  const hasBenchmarks = completedRuns > 0
  const hasFlags      = flagsCaptured > 0
  const allReady      = hasModels && hasLaunched && hasBenchmarks && hasFlags

  /* Category breakdown */
  const categoryBreakdown = useMemo(() => {
    const byCategory = stats?.by_category
    if (!byCategory) return []
    return (Object.entries(byCategory) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ cat, label: CATEGORY_LABEL[cat] ?? cat, count }))
  }, [stats])

  /* Most recent activity timestamp for subtitle */
  const lastActivity: string | null = activityEvents?.[0]?.created_at ?? null

  const metrics = [
    { icon: FlaskConical, label: "Total Labs",        value: totalLabs,      sub: "available",                                 color: "#7c3aed", href: "/labs"       },
    { icon: Zap,          label: "Active Instances",  value: activeLabs,     sub: activeLabs > 0 ? "running now" : undefined,  color: "#22d3ee", href: "/labs"       },
    { icon: Cpu,          label: "Models Loaded",     value: modelsAvailable,sub: modelsAvailable === 0 ? "none pulled" : undefined, color: "#4ade80", href: "/models"},
    { icon: Microscope,   label: "Research Sessions", value: sessionsCount,  sub: undefined,                                   color: "#60a5fa", href: "/research"   },
    { icon: BarChart2,    label: "Benchmarks Run",    value: completedRuns,  sub: undefined,                                   color: "#fbbf24", href: "/benchmarks" },
    { icon: Flag,         label: "Flags Captured",    value: flagsCaptured,  sub: totalFlags > 0 ? `of ${totalFlags}` : undefined, color: "#a78bfa", href: "/ctf"   },
    { icon: Bug,          label: "Research Findings", value: findingsCount,  sub: undefined,                                   color: "#f97316", href: "/findings"   },
  ]

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="display text-[24px] font-semibold text-foreground" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.025em" }}>Research Command Center</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalLabs} labs available
            {modelsAvailable > 0 && ` · ${modelsAvailable} model${modelsAvailable !== 1 ? "s" : ""} loaded`}
            {lastActivity && (
              <> · last activity <TimeAgo date={lastActivity} className="inline" /></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/benchmarks"
            className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-foreground transition-all hover:bg-white/[0.07] hover:border-white/12"
          >
            <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
            Run Benchmark
          </Link>
          <Link
            href="/labs"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_0_20px_#7c3aed45] transition-all hover:bg-violet-500 hover:shadow-[0_0_28px_#7c3aed65]"
          >
            <Zap className="h-3.5 w-3.5" />
            Launch Lab
          </Link>
        </div>
      </div>

      {/* ── Metrics strip ── */}
      <div className="grid grid-cols-4 gap-3 xl:grid-cols-7">
        {metrics.map(m => (
          <MetricCard key={m.label} icon={m.icon} label={m.label} value={m.value} sub={m.sub} color={m.color} href={m.href} />
        ))}
      </div>

      {/* ── Main row: Activity + Getting Started ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">

        {/* Platform Activity */}
        <div className="surface rounded-xl overflow-hidden flex flex-col min-h-[320px]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {(activityEvents?.length ?? 0) > 0 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                )}
                <span className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  (activityEvents?.length ?? 0) > 0 ? "bg-emerald-400" : "bg-muted-foreground/20"
                )} />
              </span>
              <h2 className="text-[13px] font-semibold text-foreground">Platform Activity</h2>
              {(activityEvents?.length ?? 0) > 0 && (
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground/60 mono">live</span>
              )}
            </div>
            <Link href="/soc" className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
              Full console <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/30">
            {(activityEvents?.length ?? 0) > 0 ? (
              activityEvents.map((e: any) => (
                <div key={e.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <span
                    className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{
                      background: ACTIVITY_COLOR[e.event_type] ?? "#6b7280",
                      boxShadow: `0 0 5px ${ACTIVITY_COLOR[e.event_type] ?? "#6b7280"}60`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium truncate" style={{ color: ACTIVITY_COLOR[e.event_type] ?? "#94a3b8" }}>
                      {ACTIVITY_LABEL[e.event_type] ?? e.event_type}
                    </p>
                    <p className="text-[11px] text-muted-foreground/55 truncate">{e.title}</p>
                  </div>
                  {e.lab_slug && (
                    <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-muted-foreground/40 mono">
                      {e.lab_slug}
                    </span>
                  )}
                  <TimeAgo date={e.created_at} className="shrink-0 text-[9px] text-muted-foreground/35 mono" />
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-14">
                <Activity className="h-8 w-8 text-muted-foreground/15" />
                <div className="text-center">
                  <p className="text-[13px] font-medium text-muted-foreground/60">No activity yet</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/35 max-w-[260px]">
                    Events appear here as you launch labs, run benchmarks, and capture flags
                  </p>
                </div>
                <Link
                  href="/labs"
                  className="mt-1 flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-violet-500 transition-colors"
                >
                  <Play className="h-3 w-3" />
                  Start with a lab
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Getting Started / Benchmark Summary */}
        {!allReady ? (
          <GettingStarted hasModels={hasModels} hasLaunched={hasLaunched} hasBenchmarks={hasBenchmarks} hasFlags={hasFlags} />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Benchmark trend (shown when all steps complete) */}
            <div className="surface rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
                <h2 className="text-[13px] font-semibold text-foreground">Benchmark Trend</h2>
                <Link href="/benchmarks" className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
                  Details <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="p-4 flex flex-col gap-4">
                {scoreTrend ? (
                  <ClientOnly fallback={<div className="h-[100px] animate-pulse rounded-xl bg-white/5" />}>
                    <ResponsiveContainer width="100%" height={100}>
                      <AreaChart data={scoreTrend} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
                        <defs>
                          <linearGradient id="sGOv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="d" tick={{ fill: "#475569", fontSize: 9 }} />
                        <YAxis domain={[0, 100]} hide />
                        <Tooltip content={<ChartTip />} />
                        <Area type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2}
                          fill="url(#sGOv)" dot={false} activeDot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ClientOnly>
                ) : (
                  <div className="flex h-[100px] items-center justify-center text-[11px] text-muted-foreground/35">
                    Run multiple benchmarks to see trend
                  </div>
                )}
                {modelLeaderboard[0] && (() => {
                  const top = modelLeaderboard[0]
                  const meta = modelMeta(top.model)
                  const c = scoreColor(top.score)
                  return (
                    <div className="flex items-center gap-3 rounded-xl p-3 ring-1"
                      style={{ background: `${c}08`, boxShadow: `0 0 0 1px ${c}20` }}>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black mono"
                        style={{ background: `${meta.color}20`, color: meta.color }}>
                        {meta.abbr}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-foreground mono truncate">{top.model}</p>
                        <p className="text-[10px] text-muted-foreground/50">{top.runs} run{top.runs !== 1 ? "s" : ""} · top scorer</p>
                      </div>
                      <span className="text-xl font-extrabold" style={{ color: c }}>{top.score}</span>
                    </div>
                  )
                })()}
              </div>
            </div>
            <GettingStarted hasModels={hasModels} hasLaunched={hasLaunched} hasBenchmarks={hasBenchmarks} hasFlags={hasFlags} />
          </div>
        )}
      </div>

      {/* ── Bottom row: Research Areas + Benchmark Leaderboard ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Research Areas */}
        <div className="surface rounded-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground/50" />
              <h2 className="text-[13px] font-semibold text-foreground">Research Areas</h2>
              <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground/55 mono">
                {totalLabs} labs
              </span>
            </div>
            <Link href="/labs" className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
              All labs <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-4">
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-2.5">
                {categoryBreakdown.map(({ cat, label, count }) => (
                  <Link key={cat} href={`/labs?category=${cat}`} className="flex items-center gap-3 group">
                    <span className="w-36 shrink-0 text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate">
                      {label}
                    </span>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600/60 to-violet-500 transition-all group-hover:from-violet-500 group-hover:to-violet-400"
                        style={{ width: `${Math.min(100, (count / totalLabs) * 100 * 3)}%` }}
                      />
                    </div>
                    <span className="w-4 shrink-0 text-right text-[11px] font-semibold text-muted-foreground/50 mono">{count}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <FlaskConical className="h-8 w-8 text-muted-foreground/15" />
                <p className="text-[12px] text-muted-foreground/40">Loading research areas…</p>
              </div>
            )}
          </div>
        </div>

        {/* Benchmark Leaderboard */}
        <div className="surface rounded-xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground/50" />
              <h2 className="text-[13px] font-semibold text-foreground">Model Benchmark Results</h2>
              {modelLeaderboard.length > 0 && (
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground/55 mono">
                  {modelLeaderboard.length} tested
                </span>
              )}
            </div>
            <Link href="/benchmarks" className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
              Run test <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {modelLeaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <BarChart2 className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">No benchmarks run yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground/55 max-w-[260px] leading-relaxed">
                  Test local Ollama models against prompt injection, jailbreak resistance, and data exfiltration suites
                </p>
              </div>
              <Link
                href="/benchmarks"
                className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_0_14px_#7c3aed40] hover:bg-violet-500 transition-colors"
              >
                <Play className="h-3 w-3" />
                Run first benchmark
              </Link>
            </div>
          ) : (
            <div className="p-4 space-y-1">
              {/* Top model highlight */}
              {(() => {
                const top = modelLeaderboard[0]
                const meta = modelMeta(top.model)
                const c = scoreColor(top.score)
                return (
                  <div className="flex items-center gap-3 rounded-xl p-3 ring-1 mb-3"
                    style={{ background: `${c}08`, boxShadow: `0 0 0 1px ${c}20` }}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[12px] font-black mono"
                      style={{ background: `${meta.color}20`, color: meta.color, boxShadow: `0 0 10px ${meta.color}25` }}>
                      {meta.abbr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-foreground mono">{top.model}</span>
                        <span className="rounded-full px-1.5 text-[9px] font-bold"
                          style={{ background: `${c}20`, color: c }}>#1</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/50">
                        {top.runs} run{top.runs !== 1 ? "s" : ""} · best on {top.suite.replace(/-/g, " ")}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-extrabold" style={{ color: c }}>{top.score}</span>
                      <p className="text-[9px] text-muted-foreground/35 mono">/ 100</p>
                    </div>
                  </div>
                )
              })()}

              {modelLeaderboard.slice(1).map((m, i) => {
                const meta = modelMeta(m.model)
                const c = scoreColor(m.score)
                return (
                  <div key={m.model} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <span className="w-5 shrink-0 text-center text-[11px] font-bold text-muted-foreground/30 mono">{i + 2}</span>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold mono"
                      style={{ background: `${meta.color}15`, color: meta.color }}>
                      {meta.abbr}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium text-foreground mono">{m.model}</span>
                        <span className="text-[13px] font-bold" style={{ color: c }}>{m.score}</span>
                      </div>
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                        <div className="absolute inset-y-0 left-0 rounded-full"
                          style={{ width: `${m.score}%`, background: `linear-gradient(90deg, ${c}60, ${c})`, boxShadow: `0 0 5px ${c}40` }} />
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground/35">{m.runs}×</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
