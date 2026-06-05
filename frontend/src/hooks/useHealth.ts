"use client"

import { useQuery } from "@tanstack/react-query"
import { healthApi, settingsApi } from "@/lib/api"

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 15_000,
    retry: false,
  })
}

export function useOllama() {
  return useQuery({
    queryKey: ["settings", "ollama"],
    queryFn: settingsApi.ollamaStatus,
    refetchInterval: 30_000,
    retry: false,
  })
}
