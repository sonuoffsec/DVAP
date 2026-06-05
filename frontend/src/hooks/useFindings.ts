"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { findingsApi } from "@/lib/api"
import type { Finding, FindingSeverity } from "@/types"

export function useFindings(filters?: { severity?: FindingSeverity; status?: string }) {
  return useQuery({
    queryKey: ["findings", filters],
    queryFn: () => findingsApi.list(filters),
    staleTime: 10_000,
  })
}

export function useCreateFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Finding>) => findingsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["findings"] }),
  })
}

export function useUpdateFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Finding> }) =>
      findingsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["findings"] }),
  })
}

export function useDeleteFinding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => findingsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["findings"] }),
  })
}
