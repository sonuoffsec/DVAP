"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Play, CheckCircle2, XCircle, Loader2, RefreshCw,
  Shield, Zap, Lock, ChevronRight, BarChart2, Clock,
  AlertTriangle, TrendingUp, TrendingDown, Award,
} from "lucide-react"
import axios from "axios"
import { PageHeader } from "@/components/layout/PageHeader"
import { cn } from "@/lib/utils"

const http = axios.create({ baseURL: "/api/v1" })

/* ── Local models only ── */
const MODELS = [
  { id: "llama3.2:3b",  label: "Llama 3.2",    sub: "3B · Meta",        color: "#4ade80", abbr: "L3" },
  { id: "qwen2.5:3b",   label: "Qwen 2.5",     sub: "3B · Alibaba",     color: "#22d3ee", abbr: "Q2" },
  { id: "gemma2:2b",    label: "Gemma 2",       sub: "2B · Google",      color: "#a78bfa", abbr: "G2" },
  { id: "mistral:7b",   label: "Mistral",       sub: "7B · Mistral AI",  color: "#fbbf24", abbr: "MI" },
]

/* ── Suite metadata ── */
const SUITE_META: Record<string, { icon: typeof Shield; color: string; desc: string }> = {
  "prompt-injection":  { icon: Zap,           color: "#f87171", desc: "Resistance to direct & indirect prompt injection" },
  "jailbreak-resistance":{ icon: Lock,         color: "#fb923c", desc: "Common jailbreak technique resistance" },
  "data-exfiltration": { icon: AlertTriangle,  color: "#fbbf24", desc: "Prevention of sensitive data leakage" },
}

/* ── Score helpers ── */
function scoreColor(s: number | null) {
  if (s === null) return "#475569"
  if (s >= 80) return "#4ade80"
  if (s >= 60) return "#fbbf24"
  return "#f87171"
}
function scoreLabel(s: number | null) {
  if (s === null) return "N/A"
  if (s >= 80) return "Strong"
  if (s >= 60) return "Fair"
  return "Weak"
}
function scoreBg(s: number | null) {
  if (s === null) return "bg-zinc-700/20 text-zinc-400"
  if (s >= 80) return "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25"
  if (s >= 60) return "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25"
  return "bg-red-500/15 text-red-400 ring-1 ring-red-500/25"
}

/* ── Score gauge ── */
function ScoreRing({ score }: { score: number }) {
  const r = 42; const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const c = scoreColor(score)
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="rGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor={c} />
        </linearGradient>
        <filter id="rGlow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx={50} cy={50} r={r} fill="none" stroke="hsl(220 28% 13%)" strokeWidth={8} />
      <circle cx={50} cy={50} r={r} fill="none" stroke="url(#rGrad)" strokeWidth={8}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round" transform="rotate(-90 50 50)" filter="url(#rGlow)" />
      <text x={50} y={46} textAnchor="middle" fill="white" fontSize={22} fontWeight="800" fontFamily="inherit">{score}</text>
      <text x={50} y={60} textAnchor="middle" fill={c} fontSize={9} fontWeight="600" fontFamily="inherit">{scoreLabel(score)}</text>
    </svg>
  )
}

export default function BenchmarksPage() {
  const qc = useQueryClient()
  const [suite, setSuite] = useState("prompt-injection")
  const [model, setModel] = useState("llama3.2:3b")
  const [activeRun, setActiveRun] = useState<string | null>(null)

  const { data: suites } = useQuery({
    queryKey: ["bsuites"],
    queryFn: () => http.get("/benchmarks/suites").then(r => r.data),
  })
  const { data: runs, refetch } = useQuery({
    queryKey: ["bruns"],
    queryFn: () => http.get("/benchmarks/runs").then(r => r.data),
    refetchInterval: 5000,
  })
  const { data: detail } = useQuery({
    queryKey: ["brun", activeRun],
    queryFn: () => http.get(`/benchmarks/runs/${activeRun}`).then(r => r.data),
    enabled: !!activeRun,
    refetchInterval: (q) => q.state.data?.status === "running" ? 2000 : false,
  })

  const start = useMutation({
    mutationFn: () => http.post("/benchmarks/runs", { suite, model }).then(r => r.data),
    onSuccess: (d) => { setActiveRun(d.id); qc.invalidateQueries({ queryKey: ["bruns"] }) },
  })

  const selectedModel = MODELS.find(m => m.id === model)!
  const selectedSuite = suites?.find((s: any) => s.key === suite)
  const suiteMeta = SUITE_META[suite]
  const SuiteIcon = suiteMeta?.icon ?? Shield

  const pct = detail?.total_tests
    ? Math.round(((detail.passed_tests + detail.failed_tests) / detail.total_tests) * 100)
    : 0

  return (
    <div className="space-y-5">
      <PageHeader
        title="Benchmark Center"
        description="Evaluate local model security posture against standardized AI security test suites"
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[380px_1fr]">

        {/* ────── Left panel: Configure ────── */}
        <div className="flex flex-col gap-4">

          {/* Test Suite */}
          <div className="surface rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <BarChart2 className="h-4 w-4 text-muted-foreground/60" />
              <h3 className="text-[13px] font-semibold text-foreground">Test Suite</h3>
            </div>
            <div className="p-3 space-y-2">
              {suites?.map((s: { key: string; name: string; test_count: number }) => {
                const meta = SUITE_META[s.key]
                const Icon = meta?.icon ?? Shield
                const active = suite === s.key
                return (
                  <button
                    key={s.key}
                    onClick={() => setSuite(s.key)}
                    className={cn(
                      "group w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all",
                      active
                        ? "bg-violet-500/12 ring-1 ring-violet-500/25"
                        : "hover:bg-white/[0.03] ring-1 ring-transparent hover:ring-white/5"
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                      active ? "bg-violet-500/20" : "bg-white/[0.04] group-hover:bg-white/[0.06]"
                    )}
                      style={active ? { boxShadow: `0 0 12px ${meta?.color ?? "#7c3aed"}40` } : {}}
                    >
                      <Icon className="h-4 w-4" style={{ color: active ? (meta?.color ?? "#a78bfa") : "#64748b" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[13px] font-medium truncate",
                        active ? "text-violet-200" : "text-foreground/80"
                      )}>
                        {s.name}
                      </p>
                      {meta?.desc && (
                        <p className="text-[10px] text-muted-foreground/50 truncate mt-0.5">{meta.desc}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={cn(
                        "text-[10px] font-semibold mono px-1.5 py-0.5 rounded",
                        active ? "text-violet-300 bg-violet-500/15" : "text-muted-foreground bg-white/[0.04]"
                      )}>
                        {s.test_count} tests
                      </span>
                    </div>
                    {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-violet-400" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Model selector — CARDS not select */}
          <div className="surface rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Zap className="h-4 w-4 text-muted-foreground/60" />
              <h3 className="text-[13px] font-semibold text-foreground">Local Model</h3>
              <span className="ml-auto text-[10px] text-muted-foreground/40 mono">via Ollama</span>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {MODELS.map((m) => {
                const active = model === m.id
                return (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={cn(
                      "flex flex-col items-start gap-2.5 rounded-xl p-3 text-left transition-all",
                      active
                        ? "ring-2 ring-offset-0"
                        : "bg-white/[0.02] ring-1 ring-white/5 hover:ring-white/10 hover:bg-white/[0.04]"
                    )}
                    style={active ? {
                      background: `${m.color}12`,
                      boxShadow: `0 0 0 2px ${m.color}40, 0 0 16px ${m.color}20`,
                    } : {}}
                  >
                    {/* Avatar */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-black text-white mono"
                      style={{
                        background: active
                          ? `linear-gradient(135deg, ${m.color}60, ${m.color}30)`
                          : "hsl(220 28% 13%)",
                        color: active ? m.color : "#475569",
                        boxShadow: active ? `0 0 10px ${m.color}30` : "none",
                      }}
                    >
                      {m.abbr}
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold leading-none"
                        style={{ color: active ? m.color : "#e2e8f0" }}>
                        {m.label}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground/50">{m.sub}</p>
                    </div>
                    {active && (
                      <span className="rounded-full px-1.5 text-[9px] font-bold"
                        style={{ background: `${m.color}20`, color: m.color }}>
                        SELECTED
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-[14px] font-bold text-white transition-all",
              start.isPending
                ? "bg-violet-700/50 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-[0_0_24px_#7c3aed50] hover:shadow-[0_0_32px_#7c3aed70] hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]"
            )}
          >
            {start.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting benchmark...</>
              : <><Play className="h-4 w-4" /> Run Benchmark</>
            }
          </button>
        </div>

        {/* ────── Right panel: Results ────── */}
        <div className="flex flex-col gap-4">

          {/* Active / latest run results */}
          {detail && activeRun ? (
            <div className={cn(
              "surface rounded-xl overflow-hidden transition-all",
              detail.status === "running" && "ring-1 ring-violet-500/30 shadow-[0_0_24px_#7c3aed15]"
            )}>
              {/* Run header */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{detail.name}</p>
                  <p className="text-[10px] text-muted-foreground/50 mono">{detail.model}</p>
                </div>
                <span className={cn(
                  "rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                  detail.status === "completed"
                    ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25"
                    : detail.status === "running"
                    ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25"
                    : "bg-zinc-700/30 text-zinc-400"
                )}>
                  {detail.status === "running" && <Loader2 className="inline h-3 w-3 animate-spin mr-1" />}
                  {detail.status}
                </span>
              </div>

              <div className="p-4">
                {detail.status === "running" && (
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>Running tests...</span>
                      <span className="mono">{detail.passed_tests + detail.failed_tests} / {detail.total_tests}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-400 transition-all duration-500"
                        style={{ width: `${pct}%`, boxShadow: "0 0 8px #7c3aed80" }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10px] text-muted-foreground/40 mono">{pct}%</p>
                  </div>
                )}

                {detail.security_score !== null && (
                  <div className="flex items-center gap-6 mb-4">
                    <ScoreRing score={detail.security_score} />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/8 p-3 ring-1 ring-emerald-500/15">
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                          <div>
                            <p className="text-xl font-black text-emerald-400 leading-none">{detail.passed_tests}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Passed</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 rounded-xl bg-red-500/8 p-3 ring-1 ring-red-500/15">
                          <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                          <div>
                            <p className="text-xl font-black text-red-400 leading-none">{detail.failed_tests}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Failed</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-lg px-2.5 py-1 text-[11px] font-bold", scoreBg(detail.security_score))}>
                          {scoreLabel(detail.security_score)} Security
                        </span>
                        <span className="text-[11px] text-muted-foreground/50">
                          {detail.total_tests} tests total
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {detail.results?.length > 0 && (
                  <div>
                    <p className="section-label mb-2">Test Results</p>
                    <div className="space-y-1.5">
                      {detail.results.map((r: {
                        id: string; name: string; passed: boolean; response_preview?: string; error?: string
                      }) => (
                        <div key={r.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 transition-colors",
                            r.passed
                              ? "bg-emerald-500/5 ring-emerald-500/15"
                              : "bg-red-500/5 ring-red-500/15"
                          )}
                        >
                          {r.passed
                            ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            : <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
                          <span className={cn(
                            "flex-1 text-[12px] font-medium",
                            r.passed ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {r.name}
                          </span>
                          <span className="mono text-[9px] text-muted-foreground/30 shrink-0">{r.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="gb rounded-xl flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
                <BarChart2 className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-foreground">Ready to benchmark</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Select a suite and model, then hit Run</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {MODELS.map((m) => (
                  <span key={m.id} className="rounded-full px-2.5 py-1 text-[10px] font-medium mono"
                    style={{ background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}30` }}>
                    {m.id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Previous runs ── */}
          <div className="surface rounded-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground/60" />
                <h3 className="text-[13px] font-semibold text-foreground">Previous Runs</h3>
                {runs?.length > 0 && (
                  <span className="rounded-full bg-white/5 px-1.5 text-[10px] text-muted-foreground mono">{runs.length}</span>
                )}
              </div>
              <button onClick={() => refetch()}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/50 hover:bg-white/[0.04] hover:text-foreground transition-colors">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            {runs?.length > 0 ? (
              <div className="divide-y divide-border/40">
                {runs.slice(0, 8).map((r: {
                  id: string; name: string; model: string; status: string
                  security_score: number | null; created_at: string; suite: string
                }) => {
                  const mod = MODELS.find(m => m.id === r.model)
                  const active = activeRun === r.id
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveRun(r.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/[0.02]",
                        active && "bg-violet-500/8"
                      )}
                    >
                      {/* Model color dot */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold mono"
                        style={{
                          background: mod ? `${mod.color}18` : "hsl(220 28% 13%)",
                          color: mod?.color ?? "#475569",
                          border: `1px solid ${mod?.color ?? "#475569"}30`,
                        }}>
                        {mod?.abbr ?? "??"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-foreground">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground/50 mono">{r.model} · {r.suite}</p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {r.security_score !== null ? (
                          <>
                            <span className="text-[15px] font-black"
                              style={{ color: scoreColor(r.security_score) }}>
                              {r.security_score}
                            </span>
                            {r.security_score >= 80
                              ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                              : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                            }
                          </>
                        ) : r.status === "running" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40 mono capitalize">{r.status}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-10">
                <Award className="h-7 w-7 text-muted-foreground/15" />
                <p className="text-[12px] text-muted-foreground">No runs yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
