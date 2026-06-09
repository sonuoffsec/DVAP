"use client"

import { useState, useRef, useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Plus, Send, Loader2, Microscope, Zap, ChevronRight,
  Cpu, MessageSquare, Clock,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { http } from "@/lib/api"
import { useModels } from "@/hooks/useModels"
import { cn } from "@/lib/utils"
import { TimeAgo } from "@/components/ui/time-ago"

interface Session {
  id: string
  name: string
  model: string | null
  trace_count: number
  created_at: string
}

interface Trace {
  id: string
  event_type: string
  sequence: number
  content: string
  token_count: number | null
  latency_ms: number | null
  created_at: string
}

export default function ResearchPage() {
  const qc = useQueryClient()
  const models = useModels()
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.")
  const [model, setModel] = useState("llama3.2:3b")
  const [newName, setNewName] = useState("")
  const [showModelPicker, setShowModelPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: sessions } = useQuery({
    queryKey: ["research-sessions"],
    queryFn: () => http.get<Session[]>("/research/sessions").then(r => r.data),
    refetchInterval: 5000,
  })

  const { data: sessionDetail } = useQuery({
    queryKey: ["research-session", activeSession],
    queryFn: () => http.get(`/research/sessions/${activeSession}`).then(r => r.data),
    enabled: !!activeSession,
    refetchInterval: 3000,
  })

  const createSession = useMutation({
    mutationFn: () => {
      const name = newName.trim() || `Session ${(sessions?.length ?? 0) + 1}`
      return http.post<Session>("/research/sessions", { name, model }).then(r => r.data)
    },
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["research-sessions"] })
      setActiveSession(s.id)
      setNewName("")
    },
  })

  const sendChat = useMutation({
    mutationFn: ({ msg, sys }: { msg: string; sys: string }) =>
      http.post(`/research/sessions/${activeSession}/chat`, {
        message: msg,
        system_prompt: sys,
      }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["research-session", activeSession] })
      setMessage("")
    },
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [sessionDetail?.traces])

  const traces: Trace[] = sessionDetail?.traces ?? []
  const chatTraces = traces.filter(t => ["user_prompt", "llm_response"].includes(t.event_type))
  const selectedModel = models.find(m => m.id === model) ?? models[0]

  return (
    <div className="flex h-full gap-4 overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto">

        {/* New session input */}
        <div className="surface rounded-xl p-3 space-y-2">
          <p className="section-label">New Session</p>
          <div className="flex gap-1.5">
            <Input
              placeholder="Session name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createSession.mutate()}
              className="h-8 text-xs"
            />
            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => createSession.mutate()}
              disabled={createSession.isPending}
            >
              {createSession.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Plus className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Model picker */}
          <div>
            <p className="section-label mb-1.5">Model</p>
            <button
              onClick={() => setShowModelPicker(v => !v)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-left text-[12px] transition-all",
                showModelPicker ? "border-violet-500/40 bg-violet-500/8" : "bg-white/[0.02] hover:border-white/10"
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold mono"
                style={{ background: `${selectedModel.color}20`, color: selectedModel.color }}>
                {selectedModel.abbr}
              </span>
              <span className="flex-1 text-foreground font-medium">{selectedModel.label}</span>
              <ChevronRight className={cn("h-3 w-3 text-muted-foreground/40 transition-transform", showModelPicker && "rotate-90")} />
            </button>

            {showModelPicker && (
              <div className="mt-1.5 space-y-1">
                {models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setModel(m.id); setShowModelPicker(false) }}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all",
                      model === m.id
                        ? "ring-1"
                        : "hover:bg-white/[0.03]"
                    )}
                    style={model === m.id ? {
                      background: `${m.color}12`,
                      boxShadow: `0 0 0 1px ${m.color}35`,
                    } : {}}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold mono"
                      style={{ background: `${m.color}20`, color: m.color }}>
                      {m.abbr}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold" style={{ color: model === m.id ? m.color : "#e2e8f0" }}>
                        {m.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground/50">{m.sub}</p>
                    </div>
                    {model === m.id && (
                      <span className="ml-auto text-[8px] font-bold px-1 py-0.5 rounded"
                        style={{ background: `${m.color}20`, color: m.color }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 space-y-1 overflow-y-auto">
          {sessions?.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground/50">No sessions yet</p>
          )}
          {sessions?.map(s => {
            const mod = models.find(m => m.id === s.model)
            return (
              <button
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                  activeSession === s.id
                    ? "bg-violet-500/12 ring-1 ring-violet-500/20"
                    : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                )}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[9px] font-bold mono mt-0.5"
                  style={{ background: mod ? `${mod.color}20` : "hsl(220 28% 13%)", color: mod?.color ?? "#475569" }}>
                  {mod?.abbr ?? "??"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-[12px] font-medium",
                    activeSession === s.id ? "text-violet-200" : "text-foreground")}>
                    {s.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MessageSquare className="h-2.5 w-2.5 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/50">{s.trace_count} messages</span>
                    <span className="text-muted-foreground/30">·</span>
                    <TimeAgo date={s.created_at} className="text-[10px] text-muted-foreground/50" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {!activeSession ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Microscope className="h-8 w-8 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-foreground">Research Workspace</p>
              <p className="mt-1 text-[13px] text-muted-foreground">Create a session to start probing AI models</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {models.map(m => (
                <span key={m.id}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium mono"
                  style={{ background: `${m.color}15`, color: m.color, border: `1px solid ${m.color}30` }}>
                  {m.id}
                </span>
              ))}
            </div>
            <Button size="sm" onClick={() => createSession.mutate()} disabled={createSession.isPending}
              className="mt-2">
              <Plus className="h-3.5 w-3.5" />
              New Session
            </Button>
          </div>
        ) : (
          <>
            {/* System prompt bar */}
            <div className="shrink-0 border-b border-border bg-background/60 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="section-label whitespace-nowrap">System prompt</span>
                <Input
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  className="mono text-[11px] text-muted-foreground h-7 border-transparent bg-white/[0.03] focus:border-violet-500/30"
                  placeholder="System prompt..."
                />
                {/* Model indicator */}
                <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white/[0.02] px-2 py-1">
                  <span className="flex h-4 w-4 items-center justify-center rounded text-[8px] font-bold mono"
                    style={{ background: `${selectedModel.color}20`, color: selectedModel.color }}>
                    {selectedModel.abbr}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{selectedModel.label}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
              {chatTraces.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/15" />
                  <p className="text-[13px] text-muted-foreground">Send a message to start</p>
                </div>
              )}
              {chatTraces.map(t => {
                const isUser = t.event_type === "user_prompt"
                return (
                  <div key={t.id}
                    className={cn("flex max-w-[82%] flex-col gap-1.5 rounded-xl border p-3.5",
                      isUser
                        ? "self-end bg-violet-500/10 border-violet-500/20"
                        : "self-start surface"
                    )}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                        {isUser ? "You" : selectedModel.label}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/40">
                        {t.latency_ms && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-2.5 w-2.5" />{t.latency_ms}ms
                          </span>
                        )}
                        {t.token_count && <span>{t.token_count} tok</span>}
                      </div>
                    </div>
                    <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">{t.content}</p>
                  </div>
                )
              })}

              {sendChat.isPending && (
                <div className="self-start flex items-center gap-2 rounded-xl border surface px-3.5 py-2.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                  <span className="text-[12px] text-muted-foreground">
                    {selectedModel.label} is thinking...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-border bg-background/60 px-4 py-3">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && !sendChat.isPending && message.trim()) {
                      e.preventDefault()
                      sendChat.mutate({ msg: message, sys: systemPrompt })
                    }
                  }}
                  placeholder={`Message ${selectedModel.label}...`}
                  className="text-[13px]"
                  disabled={sendChat.isPending}
                />
                <Button
                  size="icon"
                  onClick={() => message.trim() && sendChat.mutate({ msg: message, sys: systemPrompt })}
                  disabled={!message.trim() || sendChat.isPending}
                  className="shrink-0"
                >
                  {sendChat.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground/35 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
