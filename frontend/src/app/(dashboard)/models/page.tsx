"use client"

import { useState } from "react"
import { useOllama } from "@/hooks/useHealth"
import { settingsApi } from "@/lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PageHeader } from "@/components/layout/PageHeader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, XCircle, Download, Cpu, Loader2,
  Zap, Lock, HardDrive, Hash,
} from "lucide-react"
import { cn } from "@/lib/utils"

const PROVIDERS = [
  {
    key: "ollama",
    name: "Ollama",
    description: "Local model inference. No API key required.",
    logo: "🦙",
    status: "active" as const,
  },
  {
    key: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o-mini, o1, o3 and more.",
    logo: "⬛",
    status: "coming" as const,
  },
  {
    key: "anthropic",
    name: "Anthropic",
    description: "Claude Opus, Sonnet, and Haiku models.",
    logo: "⬡",
    status: "coming" as const,
  },
  {
    key: "gemini",
    name: "Google Gemini",
    description: "Gemini 2.0 Flash, Pro, and Ultra.",
    logo: "◈",
    status: "coming" as const,
  },
  {
    key: "openrouter",
    name: "OpenRouter",
    description: "Unified API for 200+ models.",
    logo: "⇌",
    status: "coming" as const,
  },
  {
    key: "lmstudio",
    name: "LM Studio",
    description: "OpenAI-compatible local inference.",
    logo: "◻",
    status: "coming" as const,
  },
]

function ModelFamilyBadge({ family }: { family: string | null }) {
  if (!family) return null
  const colors: Record<string, string> = {
    llama:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    qwen:    "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    gemma:   "bg-violet-500/10 text-violet-400 border-violet-500/20",
    mistral: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    phi:     "bg-blue-500/10 text-blue-400 border-blue-500/20",
  }
  const lower = family.toLowerCase()
  const color = Object.entries(colors).find(([k]) => lower.includes(k))?.[1]
    ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  return (
    <span className={cn("rounded border px-1.5 py-px text-[10px] font-medium mono", color)}>
      {family}
    </span>
  )
}

export default function ModelsPage() {
  const { data: ollama, isLoading } = useOllama()
  const qc = useQueryClient()
  const [modelInput, setModelInput] = useState("")

  const pull = useMutation({
    mutationFn: (model: string) => settingsApi.pullModel(model),
    onSuccess: () => {
      setModelInput("")
      qc.invalidateQueries({ queryKey: ["settings", "ollama"] })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Hub"
        description="Manage AI providers and local model inference"
      />

      {/* Provider grid */}
      <div>
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Providers
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map(p => (
            <div
              key={p.key}
              className={cn(
                "relative flex items-start gap-3 rounded-xl border p-4 transition-colors",
                p.status === "active"
                  ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                  : "border-border bg-card opacity-60"
              )}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white/[0.04] text-xl">
                {p.logo}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold text-foreground">{p.name}</p>
                  {p.status === "active" ? (
                    <span className="flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded border border-border px-1.5 py-px text-[10px] text-muted-foreground/50">
                      <Lock className="h-2.5 w-2.5" /> Soon
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ollama detail */}
      <div className="surface rounded-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-4 w-4 text-muted-foreground/60" />
            <h2 className="text-[13px] font-semibold text-foreground">Ollama</h2>
            {!isLoading && (
              <span className={cn(
                "flex items-center gap-1 rounded border px-1.5 py-px text-[10px] font-medium",
                ollama?.reachable
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/20 bg-red-500/10 text-red-400"
              )}>
                {ollama?.reachable
                  ? <><CheckCircle2 className="h-2.5 w-2.5" /> Connected</>
                  : <><XCircle className="h-2.5 w-2.5" /> Unreachable</>
                }
              </span>
            )}
          </div>
          {ollama?.version && (
            <span className="mono text-[11px] text-muted-foreground/40">v{ollama.version}</span>
          )}
        </div>

        {/* Pull new model */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5 bg-white/[0.01]">
          <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
          <Input
            placeholder="Pull a model — e.g. llama3.2:3b, qwen2.5:7b, gemma2:9b"
            value={modelInput}
            onChange={e => setModelInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && modelInput.trim() && pull.mutate(modelInput.trim())}
            className="h-8 flex-1 text-sm"
            disabled={pull.isPending}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => pull.mutate(modelInput.trim())}
            disabled={!modelInput.trim() || pull.isPending || !ollama?.reachable}
          >
            {pull.isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Pulling...</>
              : <><Zap className="h-3.5 w-3.5" /> Pull</>
            }
          </Button>
        </div>

        {/* Model list */}
        {isLoading ? (
          <div className="space-y-px p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
            ))}
          </div>
        ) : ollama?.models.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center gap-2">
            <Cpu className="h-7 w-7 text-muted-foreground/20" />
            <p className="text-[13px] text-muted-foreground">No models pulled yet</p>
            <p className="text-[11px] text-muted-foreground/50">Pull a model above to get started</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[1fr_120px_80px] gap-4 border-b border-border px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
              <span>Model</span>
              <span>Family</span>
              <span className="text-right">Size</span>
            </div>
            {/* Rows */}
            <div className="divide-y divide-border/40">
              {ollama?.models.map(model => (
                <div
                  key={model.name}
                  className="grid grid-cols-[1fr_120px_80px] gap-4 items-center px-5 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-border">
                      <Hash className="h-3 w-3 text-muted-foreground/40" />
                    </div>
                    <span className="truncate text-[13px] font-medium text-foreground mono">
                      {model.name}
                    </span>
                  </div>
                  <ModelFamilyBadge family={model.family} />
                  <div className="flex items-center justify-end gap-1 text-[12px] text-muted-foreground/60">
                    <HardDrive className="h-3 w-3" />
                    <span className="mono">{model.size_gb.toFixed(1)} GB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
