"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { LabCard } from "@/components/labs/LabCard"
import { Input } from "@/components/ui/input"
import { useLabs } from "@/hooks/useLabs"
import { CATEGORY_CONFIG, DIFFICULTY_CONFIG } from "@/lib/constants"
import type { LabCategory, LabDifficulty } from "@/types"
import { cn } from "@/lib/utils"

const DIFFICULTIES = ["beginner", "intermediate", "advanced", "expert"] as LabDifficulty[]
const CATEGORIES = Object.keys(CATEGORY_CONFIG) as LabCategory[]

export default function LabsPage() {
  const [search, setSearch] = useState("")
  const [activeDifficulty, setActiveDifficulty] = useState<LabDifficulty | null>(null)
  const [activeCategory, setActiveCategory] = useState<LabCategory | null>(null)
  const [showCategories, setShowCategories] = useState(false)

  const { data: labs, isLoading } = useLabs({
    difficulty: activeDifficulty ?? undefined,
    category: activeCategory ?? undefined,
  })

  const filtered = labs?.filter((lab) =>
    search
      ? lab.name.toLowerCase().includes(search.toLowerCase()) ||
        lab.description.toLowerCase().includes(search.toLowerCase())
      : true
  )

  const hasFilters = activeDifficulty !== null || activeCategory !== null

  function clearFilters() {
    setActiveDifficulty(null)
    setActiveCategory(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Labs"
        description={`${labs?.length ?? 0} intentionally vulnerable environments`}
      />

      {/* Filter bar */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
            <Input
              placeholder="Search labs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Difficulty chips */}
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDifficulty(activeDifficulty === d ? null : d)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                  activeDifficulty === d
                    ? DIFFICULTY_CONFIG[d].bgColor
                    : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
                )}
              >
                {DIFFICULTY_CONFIG[d].label}
              </button>
            ))}

            <div className="h-4 w-px bg-border" />

            {/* Category toggle */}
            <button
              onClick={() => setShowCategories(!showCategories)}
              className={cn(
                "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                showCategories || activeCategory
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-white/20 hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Category
              {activeCategory && (
                <span className="rounded bg-primary/20 px-1 py-px text-[10px] text-primary">1</span>
              )}
            </button>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Category row — shown when toggled */}
        {showCategories && (
          <div className="flex flex-wrap gap-1.5 rounded-lg border border-border/50 bg-card/50 p-2.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(activeCategory === c ? null : c)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  activeCategory === c
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-white/20 hover:text-foreground"
                )}
              >
                {CATEGORY_CONFIG[c].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-card border border-border" />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lab) => (
            <LabCard key={lab.id} lab={lab} />
          ))}
        </div>
      ) : (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border">
          <p className="text-sm font-medium text-muted-foreground">No labs match the current filters</p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
