"use client"

import { useQuery } from "@tanstack/react-query"
import { labsApi } from "@/lib/api"
import type { LabCategory, LabDifficulty } from "@/types"

export function useLabs(filters?: { category?: LabCategory; difficulty?: LabDifficulty }) {
  return useQuery({
    queryKey: ["labs", filters],
    queryFn: () => labsApi.list(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useLab(slug: string) {
  return useQuery({
    queryKey: ["labs", slug],
    queryFn: () => labsApi.get(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLabStats() {
  return useQuery({
    queryKey: ["labs", "stats"],
    queryFn: labsApi.stats,
    staleTime: 30 * 1000,
  })
}
