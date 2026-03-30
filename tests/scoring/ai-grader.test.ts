import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as childProcess from "node:child_process";

import {
  parseVersionSatisfies,
  checkClaudeVersion,
  gradeWithClaude,
  parseCriteriaResponse,
  postProcess,
  computeCacheKey,
  AI_GRADING_SCHEMA,
} from "../../src/scoring/ai-grader.js";
import type { AICriteriaResponse } from "../../src/scoring/ai-grader.js";
import type { ParsedRubric } from "../../src/types.js";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

const mockExecFileSync = vi.mocked(childProcess.execFileSync);

function stubRubric(): ParsedRubric {
  return {
    domains: [
      { id: "goal-achievement", label: "Goal Achievement", description: "d", criteria: [
        { q: "Q1", title: "T1", anchors: "a", evidence: "e" },
        { q: "Q2", title: "T2", anchors: "a", evidence: "e" },
        { q: "Q3", title: "T3", anchors: "a", evidence: "e" },
        { q: "Q4", title: "T4", anchors: "a", evidence: "e" },
        { q: "Q5", title: "T5", anchors: "a", evidence: "e" },
      ] },
      { id: "collaboration-quality", label: "Collaboration Quality", description: "d", criteria: [
        { q: "Q1", title: "T1", anchors: "a", evidence: "e" },
        { q: "Q2", title: "T2", anchors: "a", evidence: "e" },
        { q: "Q3", title: "T3", anchors: "a", evidence: "e" },
        { q: "Q4", title: "T4", anchors: "a", evidence: "e" },
        { q: "Q5", title: "T5", anchors: "a", evidence: "e" },
      ] },
      { id: "workflow-mastery", label: "Workflow Mastery", description: "d", criteria: [
        { q: "Q1", title: "T1", anchors: "a", evidence: "e" },
        { q: "Q2", title: "T2", anchors: "a", evidence: "e" },
        { q: "Q3", title: "T3", anchors: "a", evidence: "e" },
        { q: "Q4", title: "T4", anchors: "a", evidence: "e" },
        { q: "Q5", title: "T5", anchors: "a", evidence: "e" },
      ] },
      { id: "growth-learning", label: "Growth & Learning", description: "d", criteria: [
        { q: "Q1", title: "T1", anchors: "a", evidence: "e" },
        { q: "Q2", title: "T2", anchors: "a", evidence: "e" },
        { q: "Q3", title: "T3", anchors: "a", evidence: "e" },
        { q: "Q4", title: "T4", anchors: "a", evidence: "e" },
        { q: "Q5", title: "T5", anchors: "a", evidence: "e" },
      ] },
      { id: "verification-quality", label: "Verification & Quality", description: "d", criteria: [
        { q: "Q1", title: "T1", anchors: "a", evidence: "e" },
        { q: "Q2", title: "T2", anchors: "a", evidence: "e" },
        { q: "Q3", title: "T3", anchors: "a", evidence: "e" },
        { q: "Q4", title: "T4", anchors: "a", evidence: "e" },
        { q: "Q5", title: "T5", anchors: "a", evidence: "e" },
      ] },
    ],
    antiGaming: "ANTI-GAMING rules",
    systemPromptHeader: "System prompt header",
  };
}

function stubAIResponse(): AICriteriaResponse {
  const ids = [
    "goal-achievement",
    "collaboration-quality",
    "workflow-mastery",
    "growth-learning",
    "verification-quality",
  ];
  return {
    domains: ids.map(id => ({
      id,
      criteria: [
        { q: "Q1", score: 3, evidence: "Evidence 1" },
        { q: "Q2", score: 4, evidence: "Evidence 2" },
        { q: "Q3", score: 4, evidence: "Evidence 3" },
        { q: "Q4", score: 3, evidence: "Evidence 4" },
        { q: "Q5", score: 5, evidence: "Evidence 5" },
      ],
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Version Check ──

describe("parseVersionSatisfies", () => {
  it("accepts 2.1.0", () => {
    expect(parseVersionSatisfies("claude 2.1.0")).toBe(true);
  });

  it("accepts 2.3.1", () => {
    expect(parseVersionSatisfies("2.3.1")).toBe(true);
  });

  it("accepts 3.0.0", () => {
    expect(parseVersionSatisfies("claude 3.0.0")).toBe(true);
  });

  it("rejects 2.0.9", () => {
    expect(parseVersionSatisfies("claude 2.0.9")).toBe(false);
  });

  it("rejects 1.5.0", () => {
    expect(parseVersionSatisfies("1.5.0")).toBe(false);
  });

  it("rejects garbage", () => {
    expect(parseVersionSatisfies("not-a-version")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(parseVersionSatisfies("")).toBe(false);
  });
});

describe("checkClaudeVersion", () => {
  it("returns true when claude reports valid version", () => {
    mockExecFileSync.mockReturnValue("claude 2.3.1");
    expect(checkClaudeVersion()).toBe(true);
  });

  it("returns false when execFileSync throws (not installed)", () => {
    mockExecFileSync.mockImplementation(() => { throw new Error("ENOENT"); });
    expect(checkClaudeVersion()).toBe(false);
  });

  it("returns false when version is too old", () => {
    mockExecFileSync.mockReturnValue("claude 1.9.0");
    expect(checkClaudeVersion()).toBe(false);
  });
});

// ── parseCriteriaResponse ──

describe("parseCriteriaResponse", () => {
  it("parses valid response", () => {
    const response = stubAIResponse();
    const result = parseCriteriaResponse(JSON.stringify(response));
    expect(result).not.toBeNull();
    expect(result!.domains).toHaveLength(5);
    expect(result!.domains[0].criteria[0].score).toBe(3);
  });

  it("returns null for invalid JSON", () => {
    expect(parseCriteriaResponse("not json")).toBeNull();
  });

  it("returns null for missing domains array", () => {
    expect(parseCriteriaResponse(JSON.stringify({ foo: "bar" }))).toBeNull();
  });

  it("returns null when domain has no criteria", () => {
    expect(parseCriteriaResponse(JSON.stringify({
      domains: [{ id: "goal-achievement" }],
    }))).toBeNull();
  });

  it("returns null when criterion missing score", () => {
    expect(parseCriteriaResponse(JSON.stringify({
      domains: [{ id: "goal-achievement", criteria: [{ q: "Q1", evidence: "e" }] }],
    }))).toBeNull();
  });

  it("handles wrapper result field from claude --output-format json", () => {
    const response = stubAIResponse();
    const wrapped = { result: response };
    const result = parseCriteriaResponse(JSON.stringify(wrapped));
    expect(result).not.toBeNull();
    expect(result!.domains).toHaveLength(5);
  });

  it("handles structured_output field from claude --json-schema", () => {
    const response = stubAIResponse();
    const wrapped = { structured_output: response, result: "some text" };
    const result = parseCriteriaResponse(JSON.stringify(wrapped));
    expect(result).not.toBeNull();
    expect(result!.domains).toHaveLength(5);
  });

  it("returns null for empty string", () => {
    expect(parseCriteriaResponse("")).toBeNull();
  });

  it("returns null for null-like input", () => {
    expect(parseCriteriaResponse("null")).toBeNull();
  });
});

// ── gradeWithClaude ──

describe("gradeWithClaude", () => {
  it("calls execFileSync with correct args and returns parsed result with actual model", () => {
    const response = stubAIResponse();
    const wrapped = { ...response, modelUsage: { "claude-haiku-4-5": { inputTokens: 1 } } };
    mockExecFileSync.mockReturnValue(JSON.stringify(wrapped));

    const result = gradeWithClaude("rubric text", "evidence data", "haiku");
    expect(result).not.toBeNull();
    expect(result!.response.domains).toHaveLength(5);
    expect(result!.actualModel).toBe("claude-haiku-4-5");

    expect(mockExecFileSync).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["-p", "--output-format", "json", "--model", "haiku"]),
      expect.objectContaining({
        input: expect.stringContaining("rubric text"),
        timeout: 300_000,
      }),
    );
  });

  it("uses 'sonnet' as default model", () => {
    mockExecFileSync.mockReturnValue(JSON.stringify(stubAIResponse()));
    gradeWithClaude("rubric", "evidence");

    expect(mockExecFileSync).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["--model", "sonnet"]),
      expect.anything(),
    );
  });

  it("falls back to alias when modelUsage is absent", () => {
    mockExecFileSync.mockReturnValue(JSON.stringify(stubAIResponse()));
    const result = gradeWithClaude("rubric", "evidence", "opus");
    expect(result).not.toBeNull();
    expect(result!.actualModel).toBe("opus");
  });

  it("returns null on execFileSync error", () => {
    mockExecFileSync.mockImplementation(() => { throw new Error("timeout"); });
    expect(gradeWithClaude("rubric", "evidence")).toBeNull();
  });

  it("returns null on invalid JSON from claude", () => {
    mockExecFileSync.mockReturnValue("not valid json");
    expect(gradeWithClaude("rubric", "evidence")).toBeNull();
  });

  it("passes evidence via stdin input option", () => {
    mockExecFileSync.mockReturnValue(JSON.stringify(stubAIResponse()));
    gradeWithClaude("rubric text", "evidence payload");

    const callArgs = mockExecFileSync.mock.calls[0];
    const options = callArgs[2] as Record<string, unknown>;
    expect(options["input"]).toContain("EVIDENCE:\nevidence payload");
  });
});

// ── postProcess ──

describe("postProcess", () => {
  it("computes correct totals and levels", () => {
    // All criteria score 3: rawPoints=15, n=5, (15-5)/(5*4)=10/20=50% -> proficient
    const response: AICriteriaResponse = {
      domains: stubAIResponse().domains.map(d => ({
        ...d,
        criteria: d.criteria.map(c => ({ ...c, score: 3 })),
      })),
    };

    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    for (const domain of result.domains) {
      expect(domain.total).toBe(50);
      expect(domain.level).toBe("proficient");
    }
  });

  it("all-1s = 0% = novice", () => {
    const response: AICriteriaResponse = {
      domains: stubAIResponse().domains.map(d => ({
        ...d,
        criteria: d.criteria.map(c => ({ ...c, score: 1 })),
      })),
    };

    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    for (const domain of result.domains) {
      expect(domain.total).toBe(0);
      expect(domain.level).toBe("novice");
    }
  });

  it("all-5s = 100% = expert", () => {
    const response: AICriteriaResponse = {
      domains: stubAIResponse().domains.map(d => ({
        ...d,
        criteria: d.criteria.map(c => ({ ...c, score: 5 })),
      })),
    };

    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    for (const domain of result.domains) {
      expect(domain.total).toBe(100);
      expect(domain.level).toBe("expert");
    }
  });

  it("example: [3,4,4,3,5,4,3] over 7 criteria = 68% = expert", () => {
    // Use a rubric with 7 criteria for one domain to test the example from the plan
    const rubric = stubRubric();
    rubric.domains[0].criteria = Array.from({ length: 7 }, (_, i) => ({
      q: `Q${i + 1}`, title: `T${i + 1}`, anchors: "a", evidence: "e",
    }));

    const response: AICriteriaResponse = {
      domains: stubAIResponse().domains.map((d, idx) => {
        if (idx === 0) {
          return {
            ...d,
            criteria: [3, 4, 4, 3, 5, 4, 3].map((s, i) => ({
              q: `Q${i + 1}`, score: s, evidence: "e",
            })),
          };
        }
        return d;
      }),
    };

    const result = postProcess(response, rubric, "sonnet", "1.0.0");
    // (26-7)/(7*4) = 19/28 = 0.6786 -> 68%
    expect(result.domains[0].total).toBe(68);
    expect(result.domains[0].level).toBe("expert");
  });

  it("level boundary: 33% = novice", () => {
    // Need total < 34 for novice. With 5 criteria, score of 33%:
    // (rawPoints - 5) / 20 = 0.33 -> rawPoints = 5 + 6.6 = ~12
    // With scores [2,2,2,3,3] = 12 -> (12-5)/20 = 7/20 = 35% -> proficient
    // With scores [2,2,2,2,3] = 11 -> (11-5)/20 = 6/20 = 30% -> novice
    const response: AICriteriaResponse = {
      domains: stubAIResponse().domains.map(d => ({
        ...d,
        criteria: [2, 2, 2, 2, 3].map((s, i) => ({
          q: `Q${i + 1}`, score: s, evidence: "e",
        })),
      })),
    };

    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    expect(result.domains[0].total).toBe(30);
    expect(result.domains[0].level).toBe("novice");
  });

  it("level boundary: 34% = proficient", () => {
    // With scores [2,2,2,3,3] = 12 -> (12-5)/20 = 7/20 = 35% -> proficient
    const response: AICriteriaResponse = {
      domains: stubAIResponse().domains.map(d => ({
        ...d,
        criteria: [2, 2, 2, 3, 3].map((s, i) => ({
          q: `Q${i + 1}`, score: s, evidence: "e",
        })),
      })),
    };

    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    expect(result.domains[0].total).toBe(35);
    expect(result.domains[0].level).toBe("proficient");
  });

  it("level boundary: 67% = expert", () => {
    // With scores [4,4,4,3,4] = 19 -> (19-5)/20 = 14/20 = 70% -> expert
    const response: AICriteriaResponse = {
      domains: stubAIResponse().domains.map(d => ({
        ...d,
        criteria: [4, 4, 4, 3, 4].map((s, i) => ({
          q: `Q${i + 1}`, score: s, evidence: "e",
        })),
      })),
    };

    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    expect(result.domains[0].total).toBe(70);
    expect(result.domains[0].level).toBe("expert");
  });

  it("throws on unknown domain id", () => {
    const response = stubAIResponse();
    response.domains[0].id = "invalid-domain";

    expect(() => postProcess(response, stubRubric(), "sonnet", "1.0.0"))
      .toThrow("Unknown domain: invalid-domain");
  });

  it("throws on criteria count mismatch", () => {
    const response = stubAIResponse();
    response.domains[0].criteria = response.domains[0].criteria.slice(0, 3);

    expect(() => postProcess(response, stubRubric(), "sonnet", "1.0.0"))
      .toThrow("expected 5 criteria, got 3");
  });

  it("throws on score out of range (0)", () => {
    const response = stubAIResponse();
    response.domains[0].criteria[0].score = 0;

    expect(() => postProcess(response, stubRubric(), "sonnet", "1.0.0"))
      .toThrow("score 0 out of range 1-5");
  });

  it("throws on score out of range (6)", () => {
    const response = stubAIResponse();
    response.domains[0].criteria[0].score = 6;

    expect(() => postProcess(response, stubRubric(), "sonnet", "1.0.0"))
      .toThrow("score 6 out of range 1-5");
  });

  it("throws on non-integer score", () => {
    const response = stubAIResponse();
    response.domains[0].criteria[0].score = 3.5;

    expect(() => postProcess(response, stubRubric(), "sonnet", "1.0.0"))
      .toThrow("score 3.5 out of range 1-5");
  });

  it("throws when not all domains are present", () => {
    const response = stubAIResponse();
    response.domains = response.domains.slice(0, 3);

    expect(() => postProcess(response, stubRubric(), "sonnet", "1.0.0"))
      .toThrow("Expected 5 domains, got 3");
  });

  it("includes model and rubricVersion in result", () => {
    const response = stubAIResponse();
    const result = postProcess(response, stubRubric(), "haiku", "2.0.0");
    expect(result.model).toBe("haiku");
    expect(result.rubricVersion).toBe("2.0.0");
  });

  it("includes gradedAt timestamp", () => {
    const response = stubAIResponse();
    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    expect(result.gradedAt).toBeTruthy();
    // Should be a valid ISO string
    expect(new Date(result.gradedAt).toISOString()).toBe(result.gradedAt);
  });

  it("generates overall summary", () => {
    const response = stubAIResponse();
    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    expect(result.overall).toContain("Overall:");
    expect(result.overall).toContain("% average");
  });

  it("maps criteria to AIGradedCriterion format", () => {
    const response = stubAIResponse();
    const result = postProcess(response, stubRubric(), "sonnet", "1.0.0");
    const first = result.domains[0].criteria[0];
    expect(first.question).toBe("Q1");
    expect(first.score).toBe(3);
    expect(first.evidence).toBe("Evidence 1");
  });
});

// ── computeCacheKey ──

describe("computeCacheKey", () => {
  it("returns a 64-char hex string (sha256)", () => {
    const key = computeCacheKey("2026-03-20", "rubric", 80, "config", "abc123");
    expect(key).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic (same inputs = same key)", () => {
    const a = computeCacheKey("2026-03-20", "rubric", 80, "config", "abc123");
    const b = computeCacheKey("2026-03-20", "rubric", 80, "config", "abc123");
    expect(a).toBe(b);
  });

  it("changes when metaMtime changes", () => {
    const a = computeCacheKey("2026-03-20", "rubric", 80, "config", "abc123");
    const b = computeCacheKey("2026-03-21", "rubric", 80, "config", "abc123");
    expect(a).not.toBe(b);
  });

  it("changes when rubricText changes", () => {
    const a = computeCacheKey("2026-03-20", "rubric v1", 80, "config", "abc123");
    const b = computeCacheKey("2026-03-20", "rubric v2", 80, "config", "abc123");
    expect(a).not.toBe(b);
  });

  it("changes when metaCount changes", () => {
    const a = computeCacheKey("2026-03-20", "rubric", 80, "config", "abc123");
    const b = computeCacheKey("2026-03-20", "rubric", 90, "config", "abc123");
    expect(a).not.toBe(b);
  });

  it("changes when configSignals changes", () => {
    const a = computeCacheKey("2026-03-20", "rubric", 80, "config-a", "abc123");
    const b = computeCacheKey("2026-03-20", "rubric", 80, "config-b", "abc123");
    expect(a).not.toBe(b);
  });

  it("changes when ruleScoresHash changes", () => {
    const a = computeCacheKey("2026-03-20", "rubric", 80, "config", "hash-a");
    const b = computeCacheKey("2026-03-20", "rubric", 80, "config", "hash-b");
    expect(a).not.toBe(b);
  });
});

// ── AI_GRADING_SCHEMA ──

describe("AI_GRADING_SCHEMA", () => {
  it("has the expected top-level structure", () => {
    expect(AI_GRADING_SCHEMA.type).toBe("object");
    expect(AI_GRADING_SCHEMA.required).toContain("domains");
  });

  it("is valid JSON-serializable", () => {
    const serialized = JSON.stringify(AI_GRADING_SCHEMA);
    expect(() => JSON.parse(serialized)).not.toThrow();
  });
});
