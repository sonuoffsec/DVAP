"use client"

import { Database, Server, Brain, Wifi } from "lucide-react"
import { useHealth } from "@/hooks/useHealth"
import { cn } from "@/lib/utils"
import type { ServiceHealth as ServiceHealthType } from "@/types"

function ServiceRow({
  name,
  icon: Icon,
  health,
  detail,
}: {
  name: string
  icon: typeof Database
  health: ServiceHealthType | undefined
  detail?: string
}) {
  const up = health?.status === "up"
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2.5">
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          up ? "bg-emerald-500/10 ring-1 ring-emerald-500/20" : "bg-red-500/10 ring-1 ring-red-500/20"
        )}>
          <Icon className={cn("h-3.5 w-3.5", up ? "text-emerald-400" : "text-red-400")} />
        </div>
        <div>
          <p className="text-sm text-foreground leading-none">{name}</p>
          {detail && <p className="mt-0.5 mono text-[10px] text-muted-foreground">{detail}</p>}
        </div>
      </div>
      <span className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
      )}>
        <span className={cn("h-1.5 w-1.5 rounded-full", up ? "bg-emerald-400" : "bg-red-400")} />
        {up ? "Healthy" : "Down"}
      </span>
    </div>
  )
}

export function ServiceHealth() {
  const { data: health, isLoading } = useHealth()

  return (
    <div className="card-glass rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Service Health</h2>
        <div className="flex items-center gap-1.5 text-[11px]">
          <Wifi className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-muted-foreground/50">live</span>
        </div>
      </div>
      <div className="px-4 divide-y divide-border/40">
        {isLoading ? (
          <div className="space-y-3 py-3">
            {["PostgreSQL", "Redis", "Ollama"].map((s) => (
              <div key={s} className="h-9 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <ServiceRow
              name="PostgreSQL"
              icon={Database}
              health={health?.services.postgres}
              detail={health?.services.postgres.version ?? undefined}
            />
            <ServiceRow
              name="Redis"
              icon={Server}
              health={health?.services.redis}
              detail={health?.services.redis.version ?? undefined}
            />
            <ServiceRow
              name="Ollama"
              icon={Brain}
              health={health?.services.ollama}
              detail={health?.services.ollama.model_count ? `${health.services.ollama.model_count} models` : undefined}
            />
          </>
        )}
      </div>
    </div>
  )
}
