import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  trend?: string
  accent?: "default" | "green" | "red" | "amber" | "blue"
}

const accentClasses = {
  default: "text-zinc-400 bg-zinc-500/10",
  green: "text-emerald-400 bg-emerald-500/10",
  red: "text-red-400 bg-red-500/10",
  amber: "text-amber-400 bg-amber-500/10",
  blue: "text-blue-400 bg-blue-500/10",
} as const

export function StatCard({ label, value, icon: Icon, trend, accent = "default" }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
          </div>
          <div className={cn("rounded-md p-2", accentClasses[accent])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
