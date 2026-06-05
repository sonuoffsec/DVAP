"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"

const http = axios.create({ baseURL: "/api/v1" })

export interface LabInstance {
  id: string
  lab_id: string
  session_token: string
  status: string
  port_mappings: Record<string, number>
  flags_captured: string[]
  started_at: string | null
  stopped_at: string | null
  access_url: string | null
}

export function useInstance(slug: string, sessionToken: string | null) {
  return useQuery({
    queryKey: ["instance", slug, sessionToken],
    queryFn: () =>
      http
        .get<LabInstance>(`/labs/${slug}/instance/${sessionToken}`)
        .then((r) => r.data),
    enabled: !!sessionToken && !!slug,
    refetchInterval: 10_000,
    retry: false,
  })
}

export function useLaunchLab(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionToken?: string) =>
      http
        .post<LabInstance>(`/labs/${slug}/launch`, { session_token: sessionToken })
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["instance", slug, data.session_token], data)
    },
  })
}

export function useStopInstance(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionToken: string) =>
      http
        .post<LabInstance>(`/labs/${slug}/instance/${sessionToken}/stop`)
        .then((r) => r.data),
    onSuccess: (_, sessionToken) => {
      qc.invalidateQueries({ queryKey: ["instance", slug, sessionToken] })
    },
  })
}

export function useResetInstance(slug: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionToken: string) =>
      http
        .post<LabInstance>(`/labs/${slug}/instance/${sessionToken}/reset`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instance", slug] })
    },
  })
}

export function useInstanceLogs(slug: string, sessionToken: string | null) {
  return useQuery({
    queryKey: ["instance-logs", slug, sessionToken],
    queryFn: () =>
      http
        .get<{ logs: string; container_id: string }>(
          `/labs/${slug}/instance/${sessionToken}/logs`
        )
        .then((r) => r.data),
    enabled: !!sessionToken,
    refetchInterval: 5_000,
  })
}

export function useFlagSubmit(slug: string, challengeSlug: string) {
  return useMutation({
    mutationFn: ({ flag, sessionToken }: { flag: string; sessionToken: string }) =>
      http
        .post(`/labs/${slug}/challenges/${challengeSlug}/submit`, {
          flag,
          session_token: sessionToken,
        })
        .then((r) => r.data),
  })
}
