"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Shield, AlertTriangle, Info, Zap, RefreshCw } from "lucide-react"
import { http } from "@/lib/api"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TimeAgo } from "@/components/ui/time-ago"


interface SocEvent {
  id: string
  event_type: string
  severity: string
  title: string
  description: string | null
  source: string | null
  lab_slug: string | null
  metadata: Record<string, unknown>
  created_at: string
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  info: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
}

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-400",
  high: "bg-orange-400",
  medium: "bg-amber-400",
  low: "bg-blue-400",
  info: "bg-zinc-500",
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  lab_launched: "Lab Launch",
  lab_stopped: "Lab Stop",
  flag_captured: "Flag Captured",
  flag_failed: "Flag Failed",
  injection_detected: "Injection Detected",
  benchmark_started: "Benchmark",
  benchmark_completed: "Benchmark",
  model_queried: "Model Query",
  research_session: "Research",
  anomaly_detected: "Anomaly",
}

export default function SOCPage() {
  const [severity, setSeverity] = useState<string | null>(null)

  const { data: events, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["soc-events", severity],
    queryFn: () =>
      http.get<SocEvent[]>("/soc/events", {
        params: { limit: 100, ...(severity ? { severity } : {}) },
      }).then(r => r.data),
    refetchInterval: 8000,
  })

  const { data: stats } = useQuery({
    queryKey: ["soc-stats"],
    queryFn: () => http.get("/soc/stats").then(r => r.data),
    refetchInterval: 10000,
  })

  const SEVERITIES = ["critical", "high", "medium", "low", "info"]

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI-SOC"
        description="Real-time security event feed from lab activity, model queries, and detection rules"
        actions={
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {SEVERITIES.map(s => (
            <Card
              key={s}
              className={cn("cursor-pointer transition-colors", severity === s && "border-primary/40")}
              onClick={() => setSeverity(severity === s ? null : s)}
            >
              <CardContent className="pt-3 pb-2 text-center">
                <p className="text-xl font-bold text-foreground">{stats.by_severity?.[s] ?? 0}</p>
                <span className={cn("rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize", SEVERITY_STYLES[s])}>
                  {s}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-card border border-border" />
          ))
        ) : events?.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border">
            <Shield className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No events yet. Launch a lab to generate activity.</p>
          </div>
        ) : (
          events?.map(event => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-zinc-600"
            >
              <span className={cn("h-2 w-2 shrink-0 rounded-full", SEVERITY_DOT[event.severity])} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{event.title}</span>
                  {event.lab_slug && (
                    <span className="shrink-0 mono rounded border border-zinc-700/50 bg-zinc-800/50 px-1.5 py-0.5 text-[10px] text-zinc-400">
                      {event.lab_slug}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}</span>
                  {event.source && <span>· {event.source}</span>}
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize", SEVERITY_STYLES[event.severity])}>
                  {event.severity}
                </span>
                <TimeAgo date={event.created_at} className="text-[10px] text-muted-foreground" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
