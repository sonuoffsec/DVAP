import axios from "axios"
import type { HealthResponse, LabDetail, LabStats, LabSummary, OllamaStatus, Finding, FindingSeverity, CtfScoreboard } from "@/types"

export const http = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ?? err.message ?? "Request failed"
    return Promise.reject(new Error(message))
  }
)

export const labsApi = {
  list: (params?: { category?: string; difficulty?: string }) =>
    http.get<LabSummary[]>("/labs", { params }).then((r) => r.data),

  get: (slug: string) =>
    http.get<LabDetail>(`/labs/${slug}`).then((r) => r.data),

  stats: () =>
    http.get<LabStats>("/labs/stats").then((r) => r.data),

  submitFlag: (slug: string, challengeSlug: string, flag: string, sessionToken: string) =>
    http
      .post(`/labs/${slug}/challenges/${challengeSlug}/submit`, {
        flag,
        session_token: sessionToken,
      })
      .then((r) => r.data),
}

export const findingsApi = {
  list: (params?: { severity?: FindingSeverity; status?: string; lab_id?: string }) =>
    http.get<Finding[]>("/findings", { params }).then((r) => r.data),

  create: (data: Partial<Finding>) =>
    http.post<Finding>("/findings", data).then((r) => r.data),

  update: (id: string, data: Partial<Finding>) =>
    http.patch<Finding>(`/findings/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    http.delete(`/findings/${id}`),
}

export const settingsApi = {
  ollamaStatus: () =>
    http.get<OllamaStatus>("/settings/ollama").then((r) => r.data),

  pullModel: (model: string) =>
    http.post("/settings/ollama/pull", { model }).then((r) => r.data),
}

export const healthApi = {
  check: () =>
    http.get<HealthResponse>("/health").then((r) => r.data),
}

export const ctfApi = {
  scoreboard: () =>
    http.get<CtfScoreboard>("/labs/ctf/scoreboard").then((r) => r.data),
}
