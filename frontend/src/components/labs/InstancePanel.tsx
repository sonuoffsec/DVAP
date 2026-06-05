"use client"

import { ExternalLink, RefreshCw, Square, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { LabInstance } from "@/hooks/useInstance"
import { useInstanceLogs, useResetInstance, useStopInstance } from "@/hooks/useInstance"
import { cn } from "@/lib/utils"

interface InstancePanelProps {
  slug: string
  instance: LabInstance
  onStopped: () => void
  onReset: (newToken: string) => void
}

export function InstancePanel({ slug, instance, onStopped, onReset }: InstancePanelProps) {
  const stop  = useStopInstance(slug)
  const reset = useResetInstance(slug)
  const { data: logsData } = useInstanceLogs(slug, instance.session_token)

  const handleStop = async () => {
    await stop.mutateAsync(instance.session_token)
    onStopped()
  }

  const handleReset = async () => {
    const newInstance = await reset.mutateAsync(instance.session_token)
    onReset(newInstance.session_token)
  }

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[13px] font-semibold text-emerald-400">Lab Running</span>
          </div>
          {instance.access_url && (
            <p className="mono text-[11px] text-muted-foreground">{instance.access_url}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {instance.access_url && (
            <Button asChild size="sm" variant="outline" className="border-emerald-500/30 hover:border-emerald-500/60">
              <a href={instance.access_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open Lab
              </a>
            </Button>
          )}
          <Button
            size="sm" variant="ghost"
            onClick={handleReset}
            disabled={reset.isPending}
            title="Reset to clean state"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", reset.isPending && "animate-spin")} />
          </Button>
          <Button
            size="sm" variant="ghost"
            onClick={handleStop}
            disabled={stop.isPending}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            title="Stop lab"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Logs */}
      {logsData?.logs && (
        <div className="surface rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-[12px] font-semibold text-foreground">Container Logs</span>
          </div>
          <pre className="mono max-h-48 overflow-auto p-3 text-[11px] leading-relaxed text-zinc-300">
            {logsData.logs || "No logs yet..."}
          </pre>
        </div>
      )}
    </div>
  )
}
