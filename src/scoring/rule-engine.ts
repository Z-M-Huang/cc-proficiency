import type { DomainId, DomainScore, ConfidenceLevel, NormalizedEvent } from "../types.js";
import type { ConfigSignals } from "../parsers/config-parser.js";
import { RULES, type RuleFire, type RuleContext, type FeatureTag } from "./rules.js";

// ── Bucket Caps ──
// Per GPT-5.4: config max 25, behavior max 75, penalty max -15
const CONFIG_CAP = 25;
const BEHAVIOR_CAP = 75;
const PENALTY_CAP = -15;

export interface DomainBucket {
  configPoints: number;
  behaviorPoints: number;
  penaltyPoints: number;
  firedRules: RuleFire[];
}

/**
 * Fire all rules against session events and config.
 * Returns per-rule fire results.
 */
export function fireRules(
  events: NormalizedEvent[],
  config: ConfigSignals,
  sessionCount: number
): RuleFire[] {
  const ctx: RuleContext = { events, config, sessionCount };
  const fires: RuleFire[] = [];

  for (const rule of RULES) {
    const rawCount = rule.detect(ctx);
    if (rawCount <= 0) continue;

    const count = Math.min(rawCount, rule.maxPerSession);
    fires.push({
      ruleId: rule.id,
      domain: rule.domain,
      tier: rule.tier,
      points: rule.points * count,
      featureTags: rule.featureTags,
      evidenceType: rule.evidenceType,
      count,
    });
  }

  return fires;
}

/**
 * Aggregate rule fires into domain buckets with caps.
 */
export function aggregateToBuckets(fires: RuleFire[]): Map<DomainId, DomainBucket> {
  const buckets = new Map<DomainId, DomainBucket>();
  const domains: DomainId[] = ["cc-mastery", "tool-mcp", "agentic", "prompt-craft", "context-mgmt"];

  for (const d of domains) {
    buckets.set(d, { configPoints: 0, behaviorPoints: 0, penaltyPoints: 0, firedRules: [] });
  }

  for (const fire of fires) {
    const bucket = buckets.get(fire.domain);
    if (!bucket) continue;

    bucket.firedRules.push(fire);

    if (fire.tier === "anti-pattern") {
      bucket.penaltyPoints += fire.points; // already negative
    } else if (fire.evidenceType === "config") {
      bucket.configPoints += fire.points;
    } else {
      bucket.behaviorPoints += fire.points;
    }
  }

  // Apply caps
  for (const bucket of buckets.values()) {
    bucket.configPoints = Math.min(bucket.configPoints, CONFIG_CAP);
    bucket.behaviorPoints = Math.min(bucket.behaviorPoints, BEHAVIOR_CAP);
    bucket.penaltyPoints = Math.max(bucket.penaltyPoints, PENALTY_CAP);
  }

  return buckets;
}

/**
 * Convert buckets to domain scores.
 */
export function bucketsToScores(
  buckets: Map<DomainId, DomainBucket>,
  phase: "calibrating" | "early" | "full"
): DomainScore[] {
  // Phase-aware config weighting (GPT-5.4: calibrating 40/60, early 25/75, full 15/85)
  const configScale = phase === "calibrating" ? 2.0 : phase === "early" ? 1.5 : 1.0;
  const behaviorScale = phase === "calibrating" ? 0.8 : phase === "early" ? 1.0 : 1.15;

  const labels: Record<DomainId, string> = {
    "cc-mastery": "CC Mastery",
    "tool-mcp": "Tool & MCP",
    "agentic": "Agentic",
    "prompt-craft": "Prompt Craft",
    "context-mgmt": "Context Mgmt",
  };

  const weights: Record<DomainId, number> = {
    "cc-mastery": 0.2,
    "tool-mcp": 0.2,
    "agentic": 0.2,
    "prompt-craft": 0.2,
    "context-mgmt": 0.2,
  };

  const domains: DomainId[] = ["cc-mastery", "tool-mcp", "agentic", "prompt-craft", "context-mgmt"];
  const scores: DomainScore[] = [];

  for (const id of domains) {
    const bucket = buckets.get(id)!;
    const rawScore =
      bucket.configPoints * configScale +
      bucket.behaviorPoints * behaviorScale +
      bucket.penaltyPoints;
    const score = Math.round(Math.min(100, Math.max(0, rawScore)));
    const dataPoints = bucket.firedRules.length;

    scores.push({
      id,
      label: labels[id],
      score,
      weight: weights[id],
      confidence: getConfidence(dataPoints),
      dataPoints,
    });
  }

  return scores;
}

/**
 * Extract feature tag scores from rule fires (for mini-bar heatmap).
 */
export function extractFeatureScores(fires: RuleFire[]): Map<FeatureTag, { score: number; maxPossible: number }> {
  const featureScores = new Map<FeatureTag, { points: number; maxPossible: number }>();
  const allTags: FeatureTag[] = ["hooks", "plugins", "skills", "mcp", "agents", "plan", "memory", "rules"];

  for (const tag of allTags) {
    featureScores.set(tag, { points: 0, maxPossible: 0 });
  }

  // Calculate max possible per feature tag from all rules
  for (const rule of RULES) {
    for (const tag of rule.featureTags) {
      const entry = featureScores.get(tag)!;
      if (rule.points > 0) {
        entry.maxPossible += rule.points;
      }
    }
  }

  // Add actual points from fired rules
  for (const fire of fires) {
    for (const tag of fire.featureTags) {
      const entry = featureScores.get(tag)!;
      if (fire.points > 0) {
        entry.points += fire.points;
      }
    }
  }

  const result = new Map<FeatureTag, { score: number; maxPossible: number }>();
  for (const [tag, data] of featureScores) {
    const score = data.maxPossible > 0 ? Math.round((data.points / data.maxPossible) * 100) : 0;
    result.set(tag, { score, maxPossible: data.maxPossible });
  }

  return result;
}

function getConfidence(dataPoints: number): ConfidenceLevel {
  if (dataPoints >= 8) return "high";
  if (dataPoints >= 4) return "medium";
  return "low";
}
