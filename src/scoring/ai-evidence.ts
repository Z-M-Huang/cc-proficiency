import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { AIPhase, DomainScore, FeatureInventory } from "../types.js";
import type { ConfigSignals } from "../parsers/config-parser.js";

// ── Local Types ──

export interface FacetData {
  session_id: string;
  underlying_goal?: string;
  goal_categories?: Record<string, number>;
  outcome?: string;
  user_satisfaction_counts?: Record<string, number>;
  claude_helpfulness?: string;
  session_type?: string;
  friction_counts?: Record<string, number>;
  friction_detail?: string;
  primary_success?: string;
  brief_summary?: string;
  first_prompt?: string;
}

export interface SessionMeta {
  session_id: string;
  project_path?: string;
  start_time?: string;
  duration_minutes?: number;
  tool_counts?: Record<string, number>;
  git_commits?: number;
  git_pushes?: number;
  input_tokens?: number;
  output_tokens?: number;
  first_prompt?: string;
  lines_added?: number;
  files_modified?: number;
}

export interface SessionMetaExtended extends SessionMeta {
  user_message_count?: number;
  assistant_message_count?: number;
  languages?: Record<string, number>;
  tool_errors?: number;
  tool_error_categories?: Record<string, number>;
  uses_task_agent?: boolean;
  uses_mcp?: boolean;
  uses_web_search?: boolean;
  uses_web_fetch?: boolean;
  lines_removed?: number;
  message_hours?: number[];
  user_message_timestamps?: string[];
  user_interruptions?: number;
  user_response_times?: number[];
}

export interface MatchedSession {
  meta: SessionMetaExtended;
  facet: FacetData | null;
  project: string;
}

export interface GradingEvidence {
  sessions: MatchedSession[];
  metaCount: number;
  facetCount: number;
  corruptMeta: number;
  corruptFacets: number;
  productiveCount: number;
  warmupCount: number;
  coverage: number;
}

export interface CoverageFlags {
  hasFacets: boolean;
  facetCoverage: number;
  sufficientForTrends: boolean;
}

export interface SessionMetaStats {
  outcomes: Record<string, number>;
  achievedRate: number;
  frictionTotals: Record<string, number>;
  frictionFirstHalf: Record<string, number>;
  frictionSecondHalf: Record<string, number>;
  toolTotals: Record<string, number>;
  sessionTypes: Record<string, number>;
  gitCommitsTotal: number;
  gitPushesTotal: number;
  satisfactionCounts: Record<string, number>;
  satisfiedRate: number;
  helpfulness: Record<string, number>;
  avgDurationMinutes: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalLinesAdded: number;
  totalFilesModified: number;
  sessionCount: number;
  coveragePercent: number;
  warmupCount: number;
  projectDistribution: Record<string, number>;
  toolActivitySessions: number;
  avgToolDiversity: number;
  coverageFlags: CoverageFlags;
}

/** @deprecated Use SessionMetaStats instead */
export type PrecomputedStats = SessionMetaStats;

const FRICTION_KEY_ALIASES: Record<string, string> = {
  tool_environment_issue: "tool_environment_issues",
};

// ── Public Functions ──

export function readJsonSafe(path: string): Record<string, unknown> | null {
  try {
    const raw = stripNullBytes(readFileSync(path, "utf-8"));
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function sanitizeProjectPath(rawPath: string): string {
  if (!rawPath) return "unknown";
  const segments = rawPath.replace(/\/+$/, "").split("/").filter(Boolean);
  return (segments[segments.length - 1] ?? "unknown").replace(/[^a-zA-Z0-9._-]/g, "_") || "unknown";
}

export function normalizeFrictionKeys(counts: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    const k = FRICTION_KEY_ALIASES[key] ?? key;
    out[k] = (out[k] ?? 0) + value;
  }
  return out;
}

export function getAIPhase(metaCount: number): AIPhase {
  if (metaCount < 10) return "insufficient";
  if (metaCount <= 30) return "early";
  return "full";
}

export function assembleEvidence(metaDir: string, facetsDir?: string): GradingEvidence | null {
  const metas = readAllJson(metaDir);
  if (metas.valid.length === 0) return null;

  // Read facets (optional) and index by session_id
  const facetsResult = facetsDir ? readAllJson(facetsDir) : { valid: [], corrupt: 0 };
  const facetMap = new Map<string, FacetData>();
  for (const raw of facetsResult.valid) {
    const facet = raw as unknown as FacetData;
    if (!facet.session_id) continue;
    if (facet.friction_counts) facet.friction_counts = normalizeFrictionKeys(facet.friction_counts);
    facetMap.set(facet.session_id, facet);
  }

  // Build sessions: meta is primary, LEFT JOIN facets
  const sessions: MatchedSession[] = [];
  let warmupCount = 0;
  for (const raw of metas.valid) {
    const meta = raw as unknown as SessionMetaExtended;
    if (!meta.session_id) continue;
    const facet = facetMap.get(meta.session_id) ?? null;
    const prompt = (meta.first_prompt ?? "").trim();
    if (/^respond with ok$/i.test(prompt)) warmupCount++;
    sessions.push({ meta, facet, project: sanitizeProjectPath(meta.project_path ?? "") });
  }

  // Sort by start_time for temporal ordering
  sessions.sort((a, b) => {
    const ta = a.meta.start_time ?? "";
    const tb = b.meta.start_time ?? "";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  const productiveCount = sessions.length - warmupCount;
  const metaCount = metas.valid.length;
  const facetCount = facetMap.size;
  const coverage = metaCount > 0 ? Math.round((facetCount / metaCount) * 100) : 0;

  return {
    sessions,
    metaCount,
    facetCount,
    corruptMeta: metas.corrupt,
    corruptFacets: facetsResult.corrupt,
    productiveCount,
    warmupCount,
    coverage,
  };
}

export function precomputeStats(evidence: GradingEvidence): PrecomputedStats {
  const outcomes: Record<string, number> = {};
  const frictionTotals: Record<string, number> = {};
  const toolTotals: Record<string, number> = {};
  const sessionTypes: Record<string, number> = {};
  const satisfactionCounts: Record<string, number> = {};
  const helpfulness: Record<string, number> = {};
  let gitCommits = 0, gitPushes = 0, totalDuration = 0, durationCount = 0;
  let totalInput = 0, totalOutput = 0, totalLines = 0, totalFiles = 0, warmupCount = 0;

  for (const { facet, meta } of evidence.sessions) {
    if (facet?.outcome) incr(outcomes, facet.outcome);
    if (facet?.session_type) incr(sessionTypes, facet.session_type);
    if (facet?.friction_counts) mergeInto(frictionTotals, facet.friction_counts);
    if (facet?.user_satisfaction_counts) mergeInto(satisfactionCounts, facet.user_satisfaction_counts);
    if (facet?.claude_helpfulness) incr(helpfulness, facet.claude_helpfulness);
    const prompt = facet?.first_prompt ?? meta.first_prompt ?? "";
    if (prompt.trim().toLowerCase() === "respond with ok") warmupCount++;
    if (meta.tool_counts) mergeInto(toolTotals, meta.tool_counts);
    gitCommits += meta.git_commits ?? 0;
    gitPushes += meta.git_pushes ?? 0;
    if (meta.duration_minutes && meta.duration_minutes > 0) { totalDuration += meta.duration_minutes; durationCount++; }
    totalInput += meta.input_tokens ?? 0;
    totalOutput += meta.output_tokens ?? 0;
    totalLines += meta.lines_added ?? 0;
    totalFiles += meta.files_modified ?? 0;
  }

  const half = Math.floor(evidence.sessions.length / 2);
  const achieved = (outcomes["fully_achieved"] ?? 0) + (outcomes["mostly_achieved"] ?? 0);
  const totalOutcomes = Object.values(outcomes).reduce((a, b) => a + b, 0);
  const satisfied = satisfactionCounts["likely_satisfied"] ?? 0;
  const totalSat = Object.values(satisfactionCounts).reduce((a, b) => a + b, 0);
  const totalMeta = evidence.metaCount + evidence.corruptMeta;

  // Project distribution: count sessions per project
  const projectDistribution: Record<string, number> = {};
  let toolActivitySessions = 0;
  let toolDiversitySum = 0;
  for (const s of evidence.sessions) {
    incr(projectDistribution, s.project);
    const toolKeys = Object.keys(s.meta.tool_counts ?? {});
    if (toolKeys.length > 0) { toolActivitySessions++; toolDiversitySum += toolKeys.length; }
  }
  const avgToolDiversity = toolActivitySessions > 0 ? Math.round((toolDiversitySum / toolActivitySessions) * 10) / 10 : 0;
  const facetMatchCount = evidence.sessions.filter((s) => s.facet !== null).length;
  const coveragePercent = totalMeta > 0 ? Math.round((facetMatchCount / totalMeta) * 100) : 0;
  const coverageFlags: CoverageFlags = {
    hasFacets: evidence.facetCount > 0,
    facetCoverage: coveragePercent,
    sufficientForTrends: evidence.facetCount >= 20,
  };

  return {
    outcomes, achievedRate: totalOutcomes > 0 ? Math.round((achieved / totalOutcomes) * 100) : 0,
    frictionTotals,
    frictionFirstHalf: aggregateFriction(evidence.sessions.slice(0, half)),
    frictionSecondHalf: aggregateFriction(evidence.sessions.slice(half)),
    toolTotals, sessionTypes,
    gitCommitsTotal: gitCommits, gitPushesTotal: gitPushes,
    satisfactionCounts, satisfiedRate: totalSat > 0 ? Math.round((satisfied / totalSat) * 100) : 0,
    helpfulness,
    avgDurationMinutes: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    totalInputTokens: totalInput, totalOutputTokens: totalOutput,
    totalLinesAdded: totalLines, totalFilesModified: totalFiles,
    sessionCount: evidence.sessions.length,
    coveragePercent,
    warmupCount,
    projectDistribution,
    toolActivitySessions,
    avgToolDiversity,
    coverageFlags,
  };
}

export function buildEvidencePayload(
  stats: SessionMetaStats,
  config: ConfigSignals,
  ruleScores?: DomainScore[],
  features?: FeatureInventory,
): string {
  const flags = stats.coverageFlags ?? { hasFacets: false, facetCoverage: 0, sufficientForTrends: false };
  const productiveCount = stats.sessionCount - stats.warmupCount;
  const warmupPct = stats.sessionCount > 0 ? Math.round((stats.warmupCount / stats.sessionCount) * 100) : 0;
  const toolPct = stats.sessionCount > 0 ? Math.round((stats.toolActivitySessions / stats.sessionCount) * 100) : 0;

  const lines: string[] = [
    `SESSION COVERAGE: ${stats.sessionCount} total, ${productiveCount} non-warmup, ${stats.warmupCount} warmup (${warmupPct}%)`,
    `FACET COVERAGE: ${Math.round((flags.facetCoverage / 100) * stats.sessionCount)}/${stats.sessionCount} (${flags.facetCoverage}%) — qualitative signals from this subset only`,
    "",
    "── TIER 1: QUANTITATIVE (from session-meta, all sessions) ──",
    `TOOL ACTIVITY: ${stats.toolActivitySessions} sessions with tool use (${toolPct}%)`,
    `TOOL DISTRIBUTION: ${formatSortedRecord(stats.toolTotals)}`,
    `TOKEN TOTALS: input=${stats.totalInputTokens}, output=${stats.totalOutputTokens}`,
    `PROJECT DISTRIBUTION: ${formatSortedRecord(stats.projectDistribution)}`,
    `GIT: ${stats.gitCommitsTotal} commits, ${stats.gitPushesTotal} pushes`,
  ];

  if (flags.hasFacets) {
    lines.push(
      "",
      `── TIER 2: QUALITATIVE (from facets, ${flags.facetCoverage}% sample) ──`,
      `OUTCOME DISTRIBUTION: ${formatSortedRecord(stats.outcomes)}`,
      `ACHIEVED RATE: ${stats.achievedRate}%`,
      `SATISFACTION: ${formatSortedRecord(stats.satisfactionCounts)}`,
      `FRICTION TOTALS: ${formatSortedRecord(stats.frictionTotals)}`,
      `FRICTION TREND: first-half=${formatSortedRecord(stats.frictionFirstHalf)} second-half=${formatSortedRecord(stats.frictionSecondHalf)}`,
      `SESSION TYPES: ${formatSortedRecord(stats.sessionTypes)}`,
    );
  }

  if (ruleScores) {
    lines.push(
      "",
      "── TIER 3: RULE ENGINE FEATURES ──",
      `RULE-BASED DOMAIN SCORES: ${ruleScores.map((d) => `${d.id}=${d.percentage}%`).join(", ")}`,
    );
    if (features) {
      lines.push(`FEATURE INVENTORY: ${formatFeatureInventory(features)}`);
    }
    lines.push(
      `CONFIG: hooks=${config.hasCustomHooks}(${config.hookWithMatcherCount}), rules=${config.hasRulesFiles}(${config.rulesFileCount}), mcp=${config.hasMcpServers}, memory=${config.hasMemoryFiles}(${config.memoryFileCount}), agents=${config.hasCustomAgents}, skills=${config.hasCustomSkills}`,
    );
  }

  lines.push(
    "",
    "── COVERAGE FLAGS ──",
    `FACET_AVAILABLE: ${flags.hasFacets}`,
    `FACET_COVERAGE: ${flags.facetCoverage}%`,
    `SUFFICIENT_FOR_TRENDS: ${flags.sufficientForTrends}`,
  );

  return lines.join("\n");
}

// ── Helpers ──

function formatSortedRecord(rec: Record<string, number>): string {
  const entries = Object.entries(rec).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return "{}";
  return entries.map(([k, v]) => `${k}=${v}`).join(", ");
}

function formatFeatureInventory(f: FeatureInventory): string {
  const parts: string[] = [];
  if (f.hooks.length > 0) parts.push(`hooks=[${f.hooks.map((h) => `${h.name}(${h.count})`).join(",")}]`);
  if (f.skills.length > 0) parts.push(`skills=[${f.skills.map((s) => `${s.name}(${s.count})`).join(",")}]`);
  if (f.mcpServers.length > 0) parts.push(`mcpServers=[${f.mcpServers.join(",")}]`);
  if (f.topTools.length > 0) parts.push(`topTools=[${f.topTools.map((t) => `${t.name}(${t.count})`).join(",")}]`);
  parts.push(`totalToolCalls=${f.totalToolCalls}`);
  parts.push(`uniqueTools=${f.uniqueToolCount}`);
  if (f.usedPlanMode) parts.push("planMode=true");
  if (f.hasMemory) parts.push("memory=true");
  if (f.hasRules) parts.push("rules=true");
  if (f.hasAgents) parts.push("agents=true");
  if (f.hasSkills) parts.push("skills=true");
  parts.push(`hours=${f.totalHours}`);
  return parts.join(", ");
}

function stripNullBytes(raw: string): string {
  return raw.replace(/\0/g, "");
}

function incr(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

function mergeInto(target: Record<string, number>, source: Record<string, number>): void {
  for (const [k, v] of Object.entries(source)) target[k] = (target[k] ?? 0) + v;
}

function readAllJson(dir: string): { valid: Record<string, unknown>[]; corrupt: number } {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return { valid: [], corrupt: 0 };
  }
  const valid: Record<string, unknown>[] = [];
  let corrupt = 0;
  for (const file of files) {
    const parsed = readJsonSafe(join(dir, file));
    if (parsed !== null) valid.push(parsed);
    else corrupt++;
  }
  return { valid, corrupt };
}

function aggregateFriction(sessions: MatchedSession[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const s of sessions) {
    if (s.facet?.friction_counts) mergeInto(totals, s.facet.friction_counts);
  }
  return totals;
}

/** Compute AI achievement evidence from assembled evidence. */
export function computeAIEvidence(evidence: GradingEvidence, stats: SessionMetaStats): {
  achievedRate: number;
  frictionSatisfiedCount: number;
  promptLengthTrend: number;
} {
  const hasFacets = evidence.sessions.some((s) => s.facet !== null);

  // When no facets, achievedRate and frictionSatisfiedCount default to 0
  if (!hasFacets) {
    return { achievedRate: 0, frictionSatisfiedCount: 0, promptLengthTrend: computePromptTrend(evidence.sessions) };
  }

  // frictionSatisfiedCount: sessions with friction > 0 AND achieved outcome AND user satisfied
  let frictionSatisfied = 0;
  for (const s of evidence.sessions) {
    if (!s.facet) continue;
    const hasFriction = s.facet.friction_counts && Object.values(s.facet.friction_counts).reduce((a, b) => a + b, 0) > 0;
    const achieved = s.facet.outcome === "fully_achieved" || s.facet.outcome === "mostly_achieved";
    const satisfied = s.facet.user_satisfaction_counts?.["likely_satisfied"];
    if (hasFriction && achieved && satisfied && satisfied > 0) frictionSatisfied++;
  }

  return { achievedRate: stats.achievedRate, frictionSatisfiedCount: frictionSatisfied, promptLengthTrend: computePromptTrend(evidence.sessions) };
}

function computePromptTrend(sessions: MatchedSession[]): number {
  const prompts = sessions.map((s) => (s.facet?.first_prompt ?? s.meta.first_prompt ?? "").trim()).filter((p) => p.length > 0);
  if (prompts.length < 20) return 0;
  const firstAvg = prompts.slice(0, 10).reduce((sum, p) => sum + p.split(/\s+/).length, 0) / 10;
  const recentAvg = prompts.slice(-10).reduce((sum, p) => sum + p.split(/\s+/).length, 0) / 10;
  return recentAvg - firstAvg;
}
