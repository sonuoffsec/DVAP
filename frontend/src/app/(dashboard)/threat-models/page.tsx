"use client"

import { useState } from "react"
import { GitBranch, Network, Shield, Wrench, ChevronDown, ChevronRight } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DifficultyBadge } from "@/components/labs/DifficultyBadge"
import { CategoryBadge } from "@/components/labs/CategoryBadge"
import { useLabs } from "@/hooks/useLabs"
import { cn } from "@/lib/utils"

const OWASP_MAP: Record<string, string[]> = {
  prompt_injection: ["LLM01", "LLM02"],
  memory_poisoning: ["LLM08", "LLM06"],
  rag_poisoning: ["LLM01", "LLM03"],
  tool_injection: ["LLM07", "LLM08"],
  mcp_security: ["LLM07", "LLM01"],
  browser_agent: ["LLM08", "LLM02"],
  multi_agent: ["LLM08"],
  banking: ["LLM01", "LLM06", "LLM08"],
  supply_chain: ["LLM05", "LLM03"],
  autonomous_agent: ["LLM08", "LLM04"],
  data_exfiltration: ["LLM02", "LLM06"],
  identity_trust: ["LLM08", "LLM06"],
  multi_tenant: ["LLM06"],
  healthcare: ["LLM01", "LLM06"],
  developer_platform: ["LLM01", "LLM02"],
}

export default function ThreatModelsPage() {
  const { data: labs, isLoading } = useLabs()
  const [expandedLab, setExpandedLab] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Threat Models"
        description="AI-specific threat models, OWASP LLM Top 10 and MITRE ATLAS mappings per lab"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {labs?.map(lab => {
            const expanded = expandedLab === lab.id
            const owaspIds = OWASP_MAP[lab.category] ?? []

            return (
              <div key={lab.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedLab(expanded ? null : lab.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <span className="truncate text-sm font-medium text-foreground">{lab.name}</span>
                    <DifficultyBadge difficulty={lab.difficulty} />
                    <CategoryBadge category={lab.category} />
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {owaspIds.map(id => (
                      <span key={id} className="mono rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">{id}</span>
                    ))}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-border px-4 py-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Wrench className="h-3 w-3 text-red-400" />
                          Attack Surface
                        </p>
                        <ul className="space-y-1.5">
                          {lab.attack_surface?.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/60" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Shield className="h-3 w-3 text-emerald-400" />
                          Mitigations
                        </p>
                        <ul className="space-y-1.5">
                          {lab.mitigations?.map((item: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/60" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <Network className="h-3 w-3 text-blue-400" />
                          Threat Actors
                        </p>
                        {lab.threat_model ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {lab.threat_model.threat_actors?.map((a: string) => (
                                <span key={a} className="rounded border border-border bg-muted px-2 py-0.5 text-xs text-foreground">{a}</span>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium text-amber-400">Likelihood:</span> {lab.threat_model.likelihood}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{lab.threat_model.impact}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No threat model data</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
