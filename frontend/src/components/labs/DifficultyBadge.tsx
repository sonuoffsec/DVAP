import { Badge } from "@/components/ui/badge"
import { DIFFICULTY_CONFIG } from "@/lib/constants"
import type { LabDifficulty } from "@/types"
import { cn } from "@/lib/utils"

interface DifficultyBadgeProps {
  difficulty: LabDifficulty
  className?: string
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[difficulty]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        config.bgColor,
        className
      )}
    >
      {config.label}
    </span>
  )
}
