import type {
  ProficiencyResult,
  DomainScore,
  ConfidenceLevel,
  SetupChecklist,
  FeatureInventory,
  NormalizedEvent,
  ToolCallEvent,
  ParsedSession,
} from "../types.js";
import type { ConfigSignals } from "../parsers/config-parser.js";
import { fireRules, aggregateToBuckets, bucketsToScores, extractFeatureScores } from "./rule-engine.js";
import type { FeatureTag, RuleFire } from "./rules.js";

export const SCORING_VERSION = "3.0.0";

const CALIBRATION_THRESHOLD = 3;
const FULL_CONFIDENCE_THRESHOLD = 10;

const RECENCY_WINDOWS = [
  { maxDays: 7, weight: 1.0 },
  { maxDays: 30, weight: 0.7 },
  { maxDays: 90, weight: 0.4 },
  { maxDays: Infinity, weight: 0.2 },
];

export function getConfidence(dataPoints: number): ConfidenceLevel {
  if (dataPoints >= 50) return "high";
  if (dataPoints >= 10) return "medium";
  return "low";
}

export function getPhase(sessionCount: number): "calibrating" | "early" | "full" {
  if (sessionCount < CALIBRATION_THRESHOLD) return "calibrating";
  if (sessionCount < FULL_CONFIDENCE_THRESHOLD) return "early";
  return "full";
}

export function getRecencyWeight(sessionTimestamp: string, now: number = Date.now()): number {
  const sessionTime = new Date(sessionTimestamp).getTime();
  if (isNaN(sessionTime)) return RECENCY_WINDOWS[RECENCY_WINDOWS.length - 1]!.weight;
  const daysSince = (now - sessionTime) / (24 * 60 * 60 * 1000);
  for (const window of RECENCY_WINDOWS) {
    if (daysSince <= window.maxDays) return window.weight;
  }
  return 0.2;
}

/**
 * Extract feature inventory from sessions (hooks, skills, MCP, tools used).
 */
export function extractFeatureInventory(
  sessions: ParsedSession[],
  fires: RuleFire[]
): FeatureInventory {
  const allEvents = sessions.flatMap((s) => s.events);
  const tcs = allEvents.filter((e) => e.kind === "tool_call") as ToolCallEvent[];

  // Hooks from hook_progress events
  const hookCounts = new Map<string, number>();
  for (const e of allEvents) {
    if (e.kind === "hook_progress") {
      const name = e.hookName.split(":").pop() ?? e.hookName;
      if (name === "callback" || name === "startup") continue;
      hookCounts.set(name, (hookCounts.get(name) ?? 0) + 1);
    }
  }

  // Skills
  const skillCounts = new Map<string, number>();
  for (const tc of tcs) {
    if (tc.toolName === "Skill") {
      const skill = String(tc.input?.skill ?? "unknown");
      skillCounts.set(skill, (skillCounts.get(skill) ?? 0) + 1);
    }
  }

  // MCP servers
  const mcpServers = new Set<string>();
  for (const tc of tcs) {
    if (tc.toolName.startsWith("mcp__")) {
      const parts = tc.toolName.split("__");
      if (parts.length >= 2) {
        const segments = parts.slice(1, -1).join("_").split("_").filter(Boolean);
        mcpServers.add(segments[segments.length - 1] ?? parts[1]!);
      }
    }
  }

  // Top tools
  const toolFreq = new Map<string, number>();
  for (const tc of tcs) {
    if (!tc.toolName.startsWith("mcp__")) {
      toolFreq.set(tc.toolName, (toolFreq.get(tc.toolName) ?? 0) + 1);
    }
  }
  const topTools = [...toolFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Feature scores from rule fires
  const featureScoreMap = extractFeatureScores(fires);
  const featureScores: Record<string, number> = {};
  for (const [tag, data] of featureScoreMap) {
    featureScores[tag] = data.score;
  }

  const prompts = allEvents.filter((e) => e.kind === "user_prompt");

  // Total hours from session durations
  let totalMinutes = 0;
  for (const session of sessions) {
    const start = new Date(session.startTime).getTime();
    const end = new Date(session.endTime).getTime();
    if (!isNaN(start) && !isNaN(end)) {
      const mins = (end - start) / 60000;
      if (mins > 0 && mins < 1440) totalMinutes += mins; // cap at 24h per session
    }
  }

  return {
    hooks: [...hookCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    skills: [...skillCounts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
    mcpServers: [...mcpServers],
    topTools,
    totalToolCalls: tcs.length,
    uniqueToolCount: new Set(tcs.map((tc) => tc.toolName)).size,
    usedPlanMode: prompts.some((p) => p.kind === "user_prompt" && (p as { permissionMode?: string }).permissionMode === "plan"),
    hasMemory: fires.some((f) => f.featureTags.includes("memory") && f.points > 0),
    hasRules: fires.some((f) => f.featureTags.includes("rules") && f.points > 0),
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    featureScores,
  };
}

/**
 * Main compute: fire rules, aggregate, produce result.
 */
export function computeProficiency(
  sessions: ParsedSession[],
  config: ConfigSignals,
  username: string,
  setupChecklist: SetupChecklist
): ProficiencyResult {
  const allEvents = sessions.flatMap((s) => s.events);
  const sessionCount = sessions.length;
  const projectCount = new Set(sessions.map((s) => s.project)).size;
  const phase = getPhase(sessionCount);

  // Fire all rules
  const fires = fireRules(allEvents, config, sessionCount);

  // Aggregate into domain buckets with caps
  const buckets = aggregateToBuckets(fires);

  // Convert to domain scores (phase-aware)
  const domains = bucketsToScores(buckets, phase);

  // Extract feature inventory
  const features = extractFeatureInventory(sessions, fires);

  return {
    username,
    timestamp: new Date().toISOString(),
    domains,
    features,
    sessionCount,
    projectCount,
    phase,
    setupChecklist,
  };
}
