"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Brain, Download, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useOllama } from "@/hooks/useHealth"
import { settingsApi } from "@/lib/api"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data: ollama, isLoading, refetch } = useOllama()
  const [pullModel, setPullModel] = useState("")

  const pullMutation = useMutation({
    mutationFn: (model: string) => settingsApi.pullModel(model),
    onSuccess: () => {
      setPullModel("")
      qc.invalidateQueries({ queryKey: ["settings", "ollama"] })
    },
  })

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Platform configuration and model management" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Ollama
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Connection Status</p>
              {ollama?.version && (
                <p className="mono text-xs text-muted-foreground">v{ollama.version}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : ollama?.reachable ? (
                <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-red-400">
                  <XCircle className="h-4 w-4" />
                  Unreachable
                </span>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {ollama?.models && ollama.models.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Available Models
              </p>
              <div className="space-y-1.5">
                {ollama.models.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
                  >
                    <span className="mono text-sm text-foreground">{model.name}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {model.family && <span>{model.family}</span>}
                      <span>{model.size_gb} GB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Pull Model
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. llama3.2:3b"
                value={pullModel}
                onChange={(e) => setPullModel(e.target.value)}
                className="mono"
                disabled={pullMutation.isPending}
              />
              <Button
                size="sm"
                onClick={() => pullModel && pullMutation.mutate(pullModel)}
                disabled={!pullModel || pullMutation.isPending || !ollama?.reachable}
              >
                {pullMutation.isPending ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Pull
              </Button>
            </div>
            {pullMutation.isError && (
              <p className="mt-1.5 text-xs text-red-400">{(pullMutation.error as Error).message}</p>
            )}
            {pullMutation.isSuccess && (
              <p className="mt-1.5 text-xs text-emerald-400">Model pulled successfully</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground/60">
              Recommended: llama3.2:3b, qwen2.5:3b, gemma2:2b
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
