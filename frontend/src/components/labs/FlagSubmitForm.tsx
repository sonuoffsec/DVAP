"use client"

import { useState } from "react"
import { CheckCircle2, Flag, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFlagSubmit } from "@/hooks/useInstance"
import type { Challenge } from "@/types"
import { cn } from "@/lib/utils"

interface FlagSubmitFormProps {
  labSlug: string
  challenge: Challenge
  sessionToken: string
  onCapture?: () => void
}

export function FlagSubmitForm({ labSlug, challenge, sessionToken, onCapture }: FlagSubmitFormProps) {
  const [flag, setFlag] = useState("")
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null)
  const submit = useFlagSubmit(labSlug, challenge.slug)

  const handleSubmit = async () => {
    if (!flag.trim()) return
    try {
      const data = await submit.mutateAsync({ flag: flag.trim(), sessionToken })
      setResult({ correct: data.correct, message: data.message })
      if (data.correct) {
        setFlag("")
        onCapture?.()
      }
    } catch {
      setResult({ correct: false, message: "Submission failed. Try again." })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Flag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="DVAP{...}"
            value={flag}
            onChange={(e) => { setFlag(e.target.value); setResult(null) }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="mono pl-9 text-sm"
            disabled={submit.isPending}
          />
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!flag.trim() || submit.isPending}
        >
          {submit.isPending ? "Checking..." : "Submit"}
        </Button>
      </div>

      {result && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
            result.correct
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          )}
        >
          {result.correct ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {result.message}
        </div>
      )}
    </div>
  )
}
