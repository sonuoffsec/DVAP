"use client"

import { useMemo } from "react"
import { useOllama } from "./useHealth"
import type { OllamaModel } from "@/types"

export interface ModelOption {
  id: string
  label: string
  sub: string
  color: string
  abbr: string
}

const FAMILY_META: Record<string, { color: string; label: string; vendor: string; abbr: string }> = {
  llama:    { color: "#4ade80", label: "Llama",    vendor: "Meta",       abbr: "L3" },
  qwen:     { color: "#22d3ee", label: "Qwen",     vendor: "Alibaba",    abbr: "Q2" },
  gemma:    { color: "#a78bfa", label: "Gemma",    vendor: "Google",     abbr: "G2" },
  mistral:  { color: "#fbbf24", label: "Mistral",  vendor: "Mistral AI", abbr: "MI" },
  phi:      { color: "#60a5fa", label: "Phi",      vendor: "Microsoft",  abbr: "Ph" },
  deepseek: { color: "#f97316", label: "DeepSeek", vendor: "DeepSeek",   abbr: "DS" },
  vicuna:   { color: "#e879f9", label: "Vicuna",   vendor: "LMSYS",      abbr: "VI" },
  codellama:{ color: "#34d399", label: "Code Llama", vendor: "Meta",     abbr: "CL" },
}

export const FALLBACK_MODELS: ModelOption[] = [
  { id: "llama3.2:3b",  label: "Llama 3.2",  sub: "3B · Meta",       color: "#4ade80", abbr: "L3" },
  { id: "qwen2.5:3b",   label: "Qwen 2.5",   sub: "3B · Alibaba",    color: "#22d3ee", abbr: "Q2" },
  { id: "gemma2:2b",    label: "Gemma 2",     sub: "2B · Google",     color: "#a78bfa", abbr: "G2" },
  { id: "mistral:7b",   label: "Mistral",     sub: "7B · Mistral AI", color: "#fbbf24", abbr: "MI" },
]

function toModelOption(m: OllamaModel): ModelOption {
  const lower = (m.family ?? m.name).toLowerCase()
  const match = Object.entries(FAMILY_META).find(([key]) => lower.includes(key))

  const sizeStr = m.size_gb > 0 ? `${m.size_gb.toFixed(1)}GB` : null

  if (match) {
    const [, meta] = match
    const sub = [sizeStr, meta.vendor].filter(Boolean).join(" · ")
    return { id: m.name, label: meta.label, sub, color: meta.color, abbr: meta.abbr }
  }

  const nameBase = m.name.split(":")[0]
  return {
    id: m.name,
    label: nameBase,
    sub: sizeStr ?? "",
    color: "#94a3b8",
    abbr: nameBase.slice(0, 2).toUpperCase(),
  }
}

export function useModels(): ModelOption[] {
  const { data: ollama } = useOllama()

  return useMemo(() => {
    if (!ollama?.models?.length) return FALLBACK_MODELS
    return ollama.models.map(toModelOption)
  }, [ollama?.models])
}
