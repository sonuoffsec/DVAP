"use client"

import { use, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Target, Flag, Shield, Network,
  Wrench, Lightbulb, Play, Loader2, BookOpen, ChevronDown, ChevronRight,
} from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { DifficultyBadge } from "@/components/labs/DifficultyBadge"
import { CategoryBadge } from "@/components/labs/CategoryBadge"
import { InstancePanel } from "@/components/labs/InstancePanel"
import { FlagSubmitForm } from "@/components/labs/FlagSubmitForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useLab } from "@/hooks/useLabs"
import { useLaunchLab, useInstance } from "@/hooks/useInstance"
import type { Challenge } from "@/types"
import { cn } from "@/lib/utils"

interface ChallengeCardProps {
  challenge: Challenge
  isRunning: boolean
  slug: string
  sessionToken: string | null
}

function ChallengeCard({ challenge, isRunning, slug, sessionToken }: ChallengeCardProps) {
  const [walkthroughOpen, setWalkthroughOpen] = useState(false)

  const walkthroughParagraphs = challenge.walkthrough
    ? challenge.walkthrough.split("\n\n").filter(Boolean)
    : []

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Flag className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{challenge.name}</span>
                <DifficultyBadge difficulty={challenge.difficulty} />
              </div>
              <p className="text-sm text-muted-foreground">{challenge.description}</p>
              {challenge.hints.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {challenge.hints.map((hint, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />
                      {hint}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 text-right">
              <span className="text-sm font-semibold text-primary">{challenge.points}</span>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </div>

          {isRunning && sessionToken && (
            <FlagSubmitForm labSlug={slug} challenge={challenge} sessionToken={sessionToken} />
          )}

          {walkthroughParagraphs.length > 0 && (
            <div className="border-t border-border/50 pt-3">
              <button
                onClick={() => setWalkthroughOpen(v => !v)}
                className="flex items-center gap-2 text-[12px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {walkthroughOpen ? "Hide Walkthrough" : "Show Walkthrough"}
                {walkthroughOpen
                  ? <ChevronDown className="h-3 w-3" />
                  : <ChevronRight className="h-3 w-3" />
                }
              </button>

              {walkthroughOpen && (
                <div className="mt-3 rounded-lg border border-violet-500/15 bg-violet-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-violet-500/15">
                    <BookOpen className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-[12px] font-semibold text-violet-300">Walkthrough</span>
                    <span className="ml-auto text-[10px] text-violet-400/50 italic">
                      Try to solve it first
                    </span>
                  </div>
                  {walkthroughParagraphs.map((para, i) => (
                    <p
                      key={i}
                      className={cn(
                        "text-[12px] leading-relaxed whitespace-pre-wrap",
                        para.startsWith("Step ") || para.startsWith("What this demonstrates")
                          ? "text-foreground/80 font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function LabDetailPage({ params }: PageProps) {
  const { slug } = use(params)
  const { data: lab, isLoading } = useLab(slug)
  const launch = useLaunchLab(slug)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const { data: instance, refetch: refetchInstance } = useInstance(slug, sessionToken)

  const handleLaunch = async () => {
    const inst = await launch.mutateAsync()
    setSessionToken(inst.session_token)
  }

  const handleStopped = () => {
    setSessionToken(null)
  }

  const handleReset = (newToken: string) => {
    setSessionToken(newToken)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-card" />
        <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
      </div>
    )
  }

  if (!lab) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Lab not found</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/labs">Back to Labs</Link>
        </Button>
      </div>
    )
  }

  const isRunning = !!instance && instance.status === "running"

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-muted-foreground">
          <Link href="/labs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Labs
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">{lab.name}</h1>
            <DifficultyBadge difficulty={lab.difficulty} />
            <CategoryBadge category={lab.category} />
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">{lab.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {!isRunning ? (
            <Button
              size="sm"
              onClick={handleLaunch}
              disabled={launch.isPending}
              className="shrink-0"
            >
              {launch.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {launch.isPending ? "Launching..." : "Launch Lab"}
            </Button>
          ) : null}
        </div>
      </div>

      {launch.isError && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {(launch.error as Error)?.message ?? "Failed to launch lab"}
        </div>
      )}

      {isRunning && instance && (
        <InstancePanel
          slug={slug}
          instance={instance}
          onStopped={handleStopped}
          onReset={handleReset}
        />
      )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attack-surface">Attack Surface</TabsTrigger>
          <TabsTrigger value="challenges">
            Challenges ({lab.challenges.length})
          </TabsTrigger>
          <TabsTrigger value="defense">Defense</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  Objectives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lab.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {lab.threat_model && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-3.5 w-3.5 text-primary" />
                    Threat Model
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Threat Actors
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {lab.threat_model.threat_actors.map((a) => (
                        <span
                          key={a}
                          className="rounded border border-border bg-muted px-2 py-0.5 text-xs text-foreground"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Impact
                    </p>
                    <p className="text-sm text-muted-foreground">{lab.threat_model.impact}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Likelihood
                    </p>
                    <span className="text-sm text-amber-400">{lab.threat_model.likelihood}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="attack-surface" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-red-400" />
                Attack Surface
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {lab.attack_surface.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges" className="space-y-3 pt-4">
          {!isRunning && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
              Launch the lab to submit flags
            </div>
          )}

          {lab.challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isRunning={isRunning}
              slug={slug}
              sessionToken={sessionToken}
            />
          ))}
        </TabsContent>

        <TabsContent value="defense" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  Mitigations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lab.mitigations.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/60" />
                      {m}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-blue-400" />
                  Detection Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {lab.detection_opportunities.map((d, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400/60" />
                      {d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
