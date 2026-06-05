"use client"

import { useState, useEffect } from "react"
import { formatRelativeTime } from "@/lib/utils"

interface TimeAgoProps {
  date: string
  className?: string
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  const [text, setText] = useState<string>("")

  useEffect(() => {
    setText(formatRelativeTime(date))
    const id = setInterval(() => setText(formatRelativeTime(date)), 30_000)
    return () => clearInterval(id)
  }, [date])

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  )
}
