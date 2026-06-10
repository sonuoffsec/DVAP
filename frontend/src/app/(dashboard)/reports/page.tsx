"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FileText, Plus, Download, Trash2, Loader2, Shield, AlertTriangle } from "lucide-react"
import { http } from "@/lib/api"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TimeAgo } from "@/components/ui/time-ago"


const RISK_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  informational: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
}

const REPORT_TYPES = [
  { value: "executive", label: "Executive Summary", desc: "High-level risk overview for management" },
  { value: "technical", label: "Technical Report", desc: "Full findings with OWASP + MITRE ATLAS mapping" },
]

interface Report {
  id: string
  name: string
  report_type: string
  lab_slug: string | null
  risk_rating: string | null
  findings_count: number
  owasp_count: number
  mitre_count: number
  created_at: string
}

interface ReportDetail extends Report {
  content_md: string
  owasp_mapping: { id: string; name: string; finding_count: number }[]
  mitre_mapping: { id: string; name: string; finding_count: number }[]
}

export default function ReportsPage() {
  const qc = useQueryClient()
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [reportName, setReportName] = useState("")
  const [reportType, setReportType] = useState("technical")
  const [labSlug, setLabSlug] = useState("")

  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: () => http.get<Report[]>("/reports").then(r => r.data),
  })

  const { data: detail } = useQuery({
    queryKey: ["report-detail", activeReport],
    queryFn: () => http.get<ReportDetail>(`/reports/${activeReport}`).then(r => r.data),
    enabled: !!activeReport,
  })

  const generate = useMutation({
    mutationFn: () => http.post<Report>("/reports", {
      name: reportName || `${REPORT_TYPES.find(t => t.value === reportType)?.label} (${new Date().toLocaleDateString()})`,
      report_type: reportType,
      lab_slug: labSlug || null,
    }).then(r => r.data),
    onSuccess: r => { qc.invalidateQueries({ queryKey: ["reports"] }); setActiveReport(r.id); setReportName("") },
  })

  const deleteReport = useMutation({
    mutationFn: (id: string) => http.delete(`/reports/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reports"] }); setActiveReport(null) },
  })

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col gap-3 overflow-y-auto">
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Generate Report</p>
          <Input
            placeholder="Report name (optional)"
            value={reportName}
            onChange={e => setReportName(e.target.value)}
            className="h-8 text-xs"
          />
          <div className="space-y-1">
            {REPORT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setReportType(t.value)}
                className={cn(
                  "flex w-full flex-col items-start rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
                  reportType === t.value ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-zinc-600"
                )}
              >
                <span className="font-medium">{t.label}</span>
                <span className="text-[10px] opacity-70">{t.desc}</span>
              </button>
            ))}
          </div>
          <Input
            placeholder="Lab slug (optional)"
            value={labSlug}
            onChange={e => setLabSlug(e.target.value)}
            className="h-8 text-xs mono"
          />
          <Button className="w-full" size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Generate
          </Button>
        </div>

        <div className="space-y-1">
          {reports?.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left text-xs transition-colors",
                activeReport === r.id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <span className="truncate font-medium">{r.name}</span>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                <span className="capitalize">{r.report_type.replace("_", " ")}</span>
                {r.risk_rating && (
                  <span className={cn("rounded border px-1 capitalize", RISK_STYLES[r.risk_rating])}>{r.risk_rating}</span>
                )}
              </div>
            </button>
          ))}
          {!reports?.length && <p className="px-2 py-4 text-center text-xs text-muted-foreground">No reports yet</p>}
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {generate.isPending ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Generating report...</p>
              <p className="mt-1 text-xs text-muted-foreground/55">
                Analyzing findings and mapping to OWASP LLM Top 10 and MITRE ATLAS
              </p>
            </div>
          </div>
        ) : !detail ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <FileText className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">Generate or select a report</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">{detail.name}</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="capitalize">{detail.report_type.replace("_", " ")}</span>
                  {detail.risk_rating && (
                    <span className={cn("rounded border px-1.5 py-0.5 text-[10px] capitalize font-medium", RISK_STYLES[detail.risk_rating])}>
                      {detail.risk_rating} risk
                    </span>
                  )}
                  <span>{detail.findings_count} findings</span>
                  <TimeAgo date={detail.created_at} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/v1/reports/${detail.id}/download/markdown`} download>
                    <Download className="h-3.5 w-3.5" />
                    .md
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/v1/reports/${detail.id}/download/json`} download>
                    <Download className="h-3.5 w-3.5" />
                    .json
                  </a>
                </Button>
                <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => deleteReport.mutate(detail.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {(detail.owasp_mapping.length > 0 || detail.mitre_mapping.length > 0) && (
              <div className="grid grid-cols-2 gap-3 shrink-0">
                {detail.owasp_mapping.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        OWASP LLM Top 10
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {detail.owasp_mapping.slice(0, 5).map(item => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="mono text-primary">{item.id}</span>
                            <span className="flex-1 truncate px-2 text-muted-foreground">{item.name}</span>
                            <span className="text-foreground">{item.finding_count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {detail.mitre_mapping.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-xs">
                        <Shield className="h-3.5 w-3.5 text-blue-400" />
                        MITRE ATLAS
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {detail.mitre_mapping.slice(0, 5).map(item => (
                          <div key={item.id} className="flex items-center justify-between text-xs">
                            <span className="mono text-blue-400">{item.id}</span>
                            <span className="flex-1 truncate px-2 text-muted-foreground">{item.name}</span>
                            <span className="text-foreground">{item.finding_count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-mono">
                {detail.content_md}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
