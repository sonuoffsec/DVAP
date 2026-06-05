import type { LabCategory, LabDifficulty, FindingSeverity } from "@/types"

export const DIFFICULTY_CONFIG: Record<
  LabDifficulty,
  { label: string; color: string; bgColor: string }
> = {
  beginner: {
    label: "Beginner",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  intermediate: {
    label: "Intermediate",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  advanced: {
    label: "Advanced",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  expert: {
    label: "Expert",
    color: "text-red-400",
    bgColor: "bg-red-500/10 text-red-400 border-red-500/20",
  },
}

export const CATEGORY_CONFIG: Record<LabCategory, { label: string; icon: string }> = {
  prompt_injection: { label: "Prompt Injection", icon: "Terminal" },
  memory_poisoning: { label: "Memory Poisoning", icon: "Brain" },
  rag_poisoning: { label: "RAG Poisoning", icon: "Database" },
  tool_injection: { label: "Tool Injection", icon: "Wrench" },
  mcp_security: { label: "MCP Security", icon: "Plug" },
  browser_agent: { label: "Browser Agent", icon: "Globe" },
  multi_agent: { label: "Multi-Agent", icon: "Network" },
  banking: { label: "AI Banking", icon: "Landmark" },
  supply_chain: { label: "Supply Chain", icon: "Package" },
  autonomous_agent: { label: "Autonomous Agent", icon: "Bot" },
  data_exfiltration: { label: "Data Exfiltration", icon: "ArrowUpFromLine" },
  identity_trust: { label: "Identity & Trust", icon: "ShieldAlert" },
  multi_tenant: { label: "Multi-Tenant SaaS", icon: "Users" },
  healthcare: { label: "AI Healthcare", icon: "Stethoscope" },
  developer_platform: { label: "Developer Platform", icon: "Code2" },
}

export const SEVERITY_CONFIG: Record<
  FindingSeverity,
  { label: string; color: string; bgColor: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bgColor: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  high: {
    label: "High",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  medium: {
    label: "Medium",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  low: {
    label: "Low",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  informational: {
    label: "Info",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
}

export const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: "LayoutDashboard" },
  { href: "/labs", label: "Labs", icon: "FlaskConical" },
  { href: "/ctf", label: "CTF", icon: "Flag" },
  { href: "/research", label: "Research", icon: "Microscope" },
  { href: "/attack-replay", label: "Attack Replay", icon: "CirclePlay" },
  { href: "/benchmarks", label: "Benchmarks", icon: "BarChart2" },
  { href: "/threat-models", label: "Threat Models", icon: "GitBranch" },
  { href: "/findings", label: "Findings", icon: "Bug" },
  { href: "/soc", label: "AI-SOC", icon: "Shield" },
  { href: "/reports", label: "Reports", icon: "FileText" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const
