import { CATEGORY_CONFIG } from "@/lib/constants"
import type { LabCategory } from "@/types"
import { cn } from "@/lib/utils"

interface CategoryBadgeProps {
  category: LabCategory
  className?: string
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const config = CATEGORY_CONFIG[category]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary/80",
        className
      )}
    >
      {config?.label ?? category}
    </span>
  )
}
