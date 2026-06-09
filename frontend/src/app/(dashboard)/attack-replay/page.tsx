"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Plus, ChevronRight, CheckCircle2, XCircle, Clock,
  Loader2, Crosshair, Flag, Trash2,
} from "lucide-react"
import { http } from "@/lib/api"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"


const STAGE_COLORS: Record<string, string> = {
  initial_access: "border-red-500/40 bg-red-500/5 text-red-400",
  execution: "border-orange-500/40 bg-orange-500/5 text-orange-400",
  persistence: "border-amber-500/40 bg-amber-500/5 text-amber-400",
  privilege_escalation: "border-yellow-500/40 bg-yellow-500/5 text-yellow-400",
  defense_evasion: "border-lime-500/40 bg-lime-500/5 text-lime-400",
  discovery: "border-cyan-500/40 bg-cyan-500/5 text-cyan-400",
  collection: "border-blue-500/40 bg-blue-500/5 text-blue-400",
  exfiltration: "border-purple-500/40 bg-purple-500/5 text-purple-400",
}

const RESULT_ICON = {
  success: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  partial: <Clock className="h-3.5 w-3.5 text-amber-400" />,
  pending: <Clock className="h-3.5 w-3.5 text-zinc-500" />,
}

interface Stage {
  id: string
  label: string
  techniques: [string, string][]
}

interface Step {
  id: string
  sequence: number
  mitre_stage: string
  technique: string
  technique_id: string | null
  description: string
  result: string
  flag_captured: string | null
}

interface Campaign {
  id: string
  name: string
  description: string | null
  lab_slug: string | null
  status: string
  step_count: number
  steps: Step[]
  created_at: string
}

export default function AttackReplayPage() {
  const qc = useQueryClient()
  const [activeCampaign, setActiveCampaign] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newLabSlug, setNewLabSlug] = useState("")
  const [addingStep, setAddingStep] = useState<string | null>(null)
  const [stepForm, setStepForm] = useState({ technique: "", technique_id: "", description: "", result: "pending" })

  const { data: stages } = useQuery({
    queryKey: ["campaign-stages"],
    queryFn: () => http.get<Stage[]>("/campaigns/stages").then(r => r.data),
  })

  const { data: campaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => http.get<Campaign[]>("/campaigns").then(r => r.data),
    refetchInterval: 10000,
  })

  const campaign = campaigns?.find(c => c.id === activeCampaign)

  const createCampaign = useMutation({
    mutationFn: () => http.post<Campaign>("/campaigns", { name: newName || "New Campaign", lab_slug: newLabSlug || null }).then(r => r.data),
    onSuccess: c => { qc.invalidateQueries({ queryKey: ["campaigns"] }); setActiveCampaign(c.id); setNewName(""); setNewLabSlug("") },
  })

  const addStep = useMutation({
    mutationFn: (stageId: string) =>
      http.post(`/campaigns/${activeCampaign}/steps`, {
        mitre_stage: stageId,
        technique: stepForm.technique,
        technique_id: stepForm.technique_id || null,
        description: stepForm.description,
        result: stepForm.result,
      }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); setAddingStep(null); setStepForm({ technique: "", technique_id: "", description: "", result: "pending" }) },
  })

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => http.delete(`/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["campaigns"] }); setActiveCampaign(null) },
  })

  const stepsInStage = (stageId: string) =>
    campaign?.steps.filter(s => s.mitre_stage === stageId) ?? []

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      <aside className="flex w-52 shrink-0 flex-col gap-2 overflow-y-auto">
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <Input placeholder="Campaign name..." value={newName} onChange={e => setNewName(e.target.value)} className="h-8 text-xs" />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => createCampaign.mutate()} disabled={createCampaign.isPending}>
              {createCampaign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Input placeholder="Lab slug (optional)..." value={newLabSlug} onChange={e => setNewLabSlug(e.target.value)} className="h-7 text-xs text-muted-foreground" />
        </div>

        <div className="space-y-1">
          {campaigns?.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCampaign(c.id)}
              className={cn(
                "flex w-full items-start justify-between gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors",
                activeCampaign === c.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-[10px] text-muted-foreground/60 capitalize">{c.status} · {c.step_count} steps</p>
              </div>
            </button>
          ))}
          {!campaigns?.length && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No campaigns yet</p>}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {!campaign ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Crosshair className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Create or select an attack campaign</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{campaign.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{campaign.status}{campaign.lab_slug ? ` · ${campaign.lab_slug}` : ""}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-red-400 hover:text-red-300" onClick={() => deleteCampaign.mutate(campaign.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid gap-2">
              {stages?.map(stage => {
                const stageSteps = stepsInStage(stage.id)
                const stageColor = STAGE_COLORS[stage.id] ?? "border-border bg-card text-muted-foreground"

                return (
                  <div key={stage.id} className={cn("rounded-lg border p-3", stageColor)}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold">{stage.label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] opacity-60 hover:opacity-100"
                        onClick={() => setAddingStep(addingStep === stage.id ? null : stage.id)}
                      >
                        <Plus className="h-3 w-3" />
                        Add step
                      </Button>
                    </div>

                    {stageSteps.map((step, i) => (
                      <div key={step.id} className="mb-1.5 flex items-start gap-2 rounded-md border border-white/10 bg-black/20 px-2.5 py-2">
                        <div className="mt-0.5 shrink-0">{RESULT_ICON[step.result as keyof typeof RESULT_ICON]}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">{step.technique}</p>
                          <p className="text-[10px] text-white/60 truncate">{step.description}</p>
                          {step.flag_captured && (
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-emerald-400">
                              <Flag className="h-2.5 w-2.5" />{step.flag_captured}
                            </p>
                          )}
                        </div>
                        {step.technique_id && (
                          <span className="mono shrink-0 text-[9px] opacity-50">{step.technique_id}</span>
                        )}
                      </div>
                    ))}

                    {addingStep === stage.id && (
                      <div className="mt-2 space-y-1.5 rounded-md border border-white/10 bg-black/30 p-2.5">
                        <div className="flex gap-1.5">
                          <Input
                            placeholder="Technique (e.g. LLM Prompt Injection)"
                            value={stepForm.technique}
                            onChange={e => setStepForm(f => ({ ...f, technique: e.target.value }))}
                            className="h-7 text-xs"
                          />
                          <Input
                            placeholder="ID (e.g. AML.T0051)"
                            value={stepForm.technique_id}
                            onChange={e => setStepForm(f => ({ ...f, technique_id: e.target.value }))}
                            className="h-7 w-36 text-xs mono"
                          />
                        </div>
                        <Input
                          placeholder="Description of what happened..."
                          value={stepForm.description}
                          onChange={e => setStepForm(f => ({ ...f, description: e.target.value }))}
                          className="h-7 text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={stepForm.result}
                            onChange={e => setStepForm(f => ({ ...f, result: e.target.value }))}
                            className="h-7 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none"
                          >
                            <option value="success">Success</option>
                            <option value="partial">Partial</option>
                            <option value="failed">Failed</option>
                            <option value="pending">Pending</option>
                          </select>
                          <Button size="sm" className="h-7 text-xs" onClick={() => addStep.mutate(stage.id)} disabled={!stepForm.technique || addStep.isPending}>
                            {addStep.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingStep(null)}>Cancel</Button>
                        </div>
                        {stage.techniques.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {stage.techniques.map(([id, name]) => (
                              <button
                                key={id}
                                onClick={() => setStepForm(f => ({ ...f, technique: name, technique_id: id }))}
                                className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] hover:bg-white/10"
                              >
                                {id}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
