export type LabDifficulty = "beginner" | "intermediate" | "advanced" | "expert"

export type LabCategory =
  | "prompt_injection"
  | "memory_poisoning"
  | "rag_poisoning"
  | "tool_injection"
  | "mcp_security"
  | "browser_agent"
  | "multi_agent"
  | "banking"
  | "supply_chain"
  | "autonomous_agent"
  | "data_exfiltration"
  | "identity_trust"
  | "multi_tenant"
  | "healthcare"
  | "developer_platform"

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "informational"

export type FindingStatus = "open" | "in_review" | "mitigated" | "accepted" | "false_positive"

export interface Challenge {
  id: string
  slug: string
  name: string
  description: string
  difficulty: LabDifficulty
  points: number
  hints: string[]
  sort_order: number
}

export interface LabSummary {
  id: string
  slug: string
  name: string
  description: string
  category: LabCategory
  difficulty: LabDifficulty
  version: string
  author: string | null
  tags: string[]
  objectives: string[]
  is_published: boolean
  sort_order: number
  challenge_count: number
  created_at: string
  updated_at: string
}

export interface LabDetail extends LabSummary {
  attack_surface: string[]
  mitigations: string[]
  detection_opportunities: string[]
  architecture: {
    components: string[]
    data_flow: string
    trust_boundaries: string[]
  } | null
  threat_model: {
    threat_actors: string[]
    attack_vectors: string[]
    impact: string
    likelihood: string
  } | null
  challenges: Challenge[]
}

export interface Finding {
  id: string
  title: string
  description: string
  severity: FindingSeverity
  status: FindingStatus
  lab_id: string | null
  session_token: string | null
  attack_vector: string | null
  evidence: Record<string, unknown>
  owasp_categories: string[]
  mitre_atlas: string[]
  cwe: string[]
  remediation: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ServiceHealth {
  status: "up" | "down"
  version?: string | null
  model_count?: number
  error?: string
}

export interface HealthResponse {
  status: "healthy" | "degraded"
  timestamp: string
  services: {
    postgres: ServiceHealth
    redis: ServiceHealth
    qdrant: ServiceHealth
    ollama: ServiceHealth & { model_count: number }
  }
}

export interface OllamaModel {
  name: string
  size_gb: number
  family: string | null
}

export interface OllamaStatus {
  reachable: boolean
  version: string | null
  models: OllamaModel[]
}

export interface LabStats {
  total: number
  by_difficulty: Partial<Record<LabDifficulty, number>>
  by_category: Partial<Record<LabCategory, number>>
  active: number
  ever_used: number
  total_flags: number
  captured_flags: number
}
