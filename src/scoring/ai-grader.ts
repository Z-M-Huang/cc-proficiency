import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

import type { AIDomainId, AIGradedDomain, AIGradingResult, ParsedRubric } from "../types.js";

// ── Raw AI response (before post-processing) ──

interface AICriterionResponse {
  q: string;
  score: number;
  evidence: string;
}

interface AIDomainResponse {
  id: string;
  criteria: AICriterionResponse[];
}

export interface AICriteriaResponse {
  domains: AIDomainResponse[];
}

// ── JSON Schema for claude --json-schema ──

export const AI_GRADING_SCHEMA = {
  type: "object",
  properties: {
    domains: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ["goal-achievement", "collaboration-quality", "workflow-mastery", "growth-learning", "verification-quality"] },
          criteria: {
            type: "array",
            items: {
              type: "object",
              properties: {
                q: { type: "string" },
                score: { type: "integer", minimum: 1, maximum: 5 },
                evidence: { type: "string" },
              },
              required: ["q", "score", "evidence"],
            },
          },
        },
        required: ["id", "criteria"],
      },
    },
  },
  required: ["domains"],
};

const SYSTEM_PROMPT =
  "You are a Claude Code proficiency evaluator. Follow the rubric in the user message exactly. Return JSON only. Domain IDs must be exactly: goal-achievement, collaboration-quality, workflow-mastery, growth-learning, verification-quality.";

const VALID_DOMAIN_IDS: ReadonlySet<string> = new Set<string>([
  "goal-achievement",
  "collaboration-quality",
  "workflow-mastery",
  "growth-learning",
  "verification-quality",
]);

// ── Version Check ──

export function checkClaudeVersion(): boolean {
  try {
    const raw = execFileSync("claude", ["--version"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10_000,
    });
    return parseVersionSatisfies(raw.trim());
  } catch {
    return false;
  }
}

export function parseVersionSatisfies(versionOutput: string): boolean {
  // claude --version may output something like "claude 2.3.1" or just "2.3.1"
  const match = versionOutput.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return false;
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  // Require >= 2.1.0
  if (major > 2) return true;
  if (major === 2 && minor >= 1) return true;
  return false;
}

// ── Grade with Claude ──

export interface GradeResult {
  response: AICriteriaResponse;
  actualModel: string;
}

export function gradeWithClaude(
  rubricText: string,
  evidencePayload: string,
  model?: string,
): GradeResult | null {
  const userPrompt = `${rubricText}\n\n---\n\nEVIDENCE:\n${evidencePayload}`;

  try {
    const result = execFileSync("claude", [
      "-p",
      "--output-format", "json",
      "--json-schema", JSON.stringify(AI_GRADING_SCHEMA),
      "--model", model ?? "sonnet",
      "--system-prompt", SYSTEM_PROMPT,
      "--no-session-persistence",
      "--tools", "",
    ], {
      input: userPrompt,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const parsed = parseCriteriaResponse(result);
    if (!parsed) return null;

    // Extract actual model from claude's modelUsage response
    const actualModel = extractActualModel(result, model ?? "sonnet");
    return { response: parsed, actualModel };
  } catch {
    return null;
  }
}

function extractActualModel(raw: string, fallback: string): string {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const usage = obj["modelUsage"] as Record<string, unknown> | undefined;
    if (usage) {
      const keys = Object.keys(usage);
      if (keys.length > 0) return keys[0];
    }
  } catch { /* ignore */ }
  return fallback;
}

// ── Parse & Validate Response ──

export function parseCriteriaResponse(raw: string): AICriteriaResponse | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  // Handle wrapper: claude --output-format json wraps in { result, structured_output }
  // --json-schema puts data in structured_output; plain mode puts it in result
  const inner = (obj["structured_output"] !== undefined
    ? obj["structured_output"]
    : obj["result"] !== undefined
      ? obj["result"]
      : obj) as Record<string, unknown>;
  if (!inner || typeof inner !== "object") return null;

  if (!Array.isArray(inner["domains"])) return null;
  const domains = inner["domains"] as unknown[];

  for (const d of domains) {
    if (!d || typeof d !== "object") return null;
    const domain = d as Record<string, unknown>;
    if (typeof domain["id"] !== "string") return null;
    if (!Array.isArray(domain["criteria"])) return null;
    for (const c of domain["criteria"] as unknown[]) {
      if (!c || typeof c !== "object") return null;
      const criterion = c as Record<string, unknown>;
      if (typeof criterion["q"] !== "string") return null;
      if (typeof criterion["score"] !== "number") return null;
      if (typeof criterion["evidence"] !== "string") return null;
    }
  }

  return inner as unknown as AICriteriaResponse;
}

// ── Post-Processing (Deterministic) ──

export function postProcess(
  response: AICriteriaResponse,
  rubric: ParsedRubric,
  model: string,
  rubricVersion: string,
): AIGradingResult {
  const gradedDomains: AIGradedDomain[] = [];

  for (const domain of response.domains) {
    if (!VALID_DOMAIN_IDS.has(domain.id)) {
      throw new Error(`Unknown domain: ${domain.id}`);
    }

    const expected = rubric.domains.find(d => d.id === domain.id);
    if (!expected) {
      throw new Error(`Unknown domain: ${domain.id}`);
    }

    if (domain.criteria.length !== expected.criteria.length) {
      throw new Error(
        `Domain ${domain.id}: expected ${expected.criteria.length} criteria, got ${domain.criteria.length}`,
      );
    }

    for (let i = 0; i < domain.criteria.length; i++) {
      const score = domain.criteria[i].score;
      if (score < 1 || score > 5 || !Number.isInteger(score)) {
        throw new Error(
          `Domain ${domain.id} Q${i + 1}: score ${score} out of range 1-5`,
        );
      }
    }

    const n = expected.criteria.length;
    const rawPoints = domain.criteria.reduce((sum, c) => sum + c.score, 0);
    // Normalize: all-1s = 0%, all-5s = 100%
    const total = Math.round(((rawPoints - n) / (n * 4)) * 100);
    const level: "novice" | "proficient" | "expert" =
      total < 34 ? "novice" : total < 67 ? "proficient" : "expert";

    gradedDomains.push({
      id: domain.id as AIDomainId,
      criteria: domain.criteria.map(c => ({
        question: c.q,
        score: c.score,
        evidence: c.evidence,
      })),
      total,
      level,
      summary: `${expected.label}: ${level} (${total}%)`,
    });
  }

  // Validate all 5 domains are present
  if (gradedDomains.length !== rubric.domains.length) {
    throw new Error(
      `Expected ${rubric.domains.length} domains, got ${gradedDomains.length}`,
    );
  }

  return {
    domains: gradedDomains,
    overall: computeOverallSummary(gradedDomains),
    model,
    gradedAt: new Date().toISOString(),
    rubricVersion,
  };
}

function computeOverallSummary(domains: AIGradedDomain[]): string {
  const avg = Math.round(
    domains.reduce((sum, d) => sum + d.total, 0) / domains.length,
  );
  const level = avg < 34 ? "novice" : avg < 67 ? "proficient" : "expert";
  return `Overall: ${level} (${avg}% average)`;
}

// ── Cache Key ──

export function computeCacheKey(
  metaMtime: string,
  rubricText: string,
  metaCount: number,
  configSignals: string,
  ruleScoresHash: string,
): string {
  const hash = createHash("sha256");
  hash.update(metaMtime);
  hash.update(rubricText);
  hash.update(String(metaCount));
  hash.update(configSignals);
  hash.update(ruleScoresHash);
  return hash.digest("hex");
}
