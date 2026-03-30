import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  readJsonSafe,
  sanitizeProjectPath,
  normalizeFrictionKeys,
  getAIPhase,
  assembleEvidence,
  precomputeStats,
  buildEvidencePayload,
  computeAIEvidence,
} from "../../src/scoring/ai-evidence.js";
import type { GradingEvidence, SessionMetaStats, MatchedSession } from "../../src/scoring/ai-evidence.js";
import type { ConfigSignals } from "../../src/parsers/config-parser.js";

const TEST_DIR = join(tmpdir(), "cc-prof-ai-evidence-test-" + process.pid);
const META_DIR = join(TEST_DIR, "session-meta");
const FACETS_DIR = join(TEST_DIR, "facets");

function makeMeta(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    session_id: id,
    project_path: "/app/testproject",
    start_time: "2026-03-20T10:00:00Z",
    duration_minutes: 15,
    user_message_count: 5,
    assistant_message_count: 10,
    tool_counts: { Read: 3, Edit: 2 },
    languages: { TypeScript: 2 },
    git_commits: 1,
    git_pushes: 0,
    input_tokens: 50000,
    output_tokens: 2000,
    first_prompt: "Fix the authentication bug",
    tool_errors: 0,
    lines_added: 50,
    lines_removed: 10,
    files_modified: 3,
    ...overrides,
  };
}

function makeFacet(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    session_id: id,
    underlying_goal: "Test goal",
    goal_categories: { test: 1 },
    outcome: "fully_achieved",
    user_satisfaction_counts: { likely_satisfied: 1 },
    claude_helpfulness: "very_helpful",
    session_type: "iterative_refinement",
    friction_counts: {},
    friction_detail: "",
    primary_success: "multi_file_changes",
    brief_summary: "Test session",
    ...overrides,
  };
}

function writeJson(dir: string, filename: string, data: Record<string, unknown>): void {
  writeFileSync(join(dir, filename), JSON.stringify(data));
}

function stubConfig(): ConfigSignals {
  return {
    hasGlobalClaudeMd: true,
    globalClaudeMdHasImports: false,
    projectClaudeMdCount: 1,
    hasCustomHooks: true,
    hookWithMatcherCount: 0,
    pluginCount: 0,
    pluginNames: [],
    hasRulesFiles: true,
    rulesFileCount: 2,
    hasMcpServers: true,
    hasMemoryFiles: true,
    memoryFileCount: 1,
    activeMemoryFileCount: 1,
    effortLevel: "high",
    hasCustomAgents: false,
    hasCustomSkills: false,
  };
}

beforeEach(() => {
  mkdirSync(META_DIR, { recursive: true });
  mkdirSync(FACETS_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

// ── readJsonSafe ──

describe("readJsonSafe", () => {
  it("reads valid JSON file", () => {
    const path = join(TEST_DIR, "valid.json");
    writeFileSync(path, '{"key": "value"}');
    expect(readJsonSafe(path)).toEqual({ key: "value" });
  });

  it("returns null for corrupt JSON", () => {
    const path = join(TEST_DIR, "corrupt.json");
    writeFileSync(path, "not valid json {{{");
    expect(readJsonSafe(path)).toBeNull();
  });

  it("returns null for missing file", () => {
    expect(readJsonSafe(join(TEST_DIR, "nonexistent.json"))).toBeNull();
  });

  it("strips null bytes before parsing", () => {
    const path = join(TEST_DIR, "nullbytes.json");
    writeFileSync(path, '{"k\0ey": "va\0lue"}');
    const result = readJsonSafe(path);
    expect(result).toEqual({ key: "value" });
  });
});

// ── sanitizeProjectPath ──

describe("sanitizeProjectPath", () => {
  it("extracts last segment from absolute path", () => {
    expect(sanitizeProjectPath("/app/myproject")).toBe("myproject");
  });

  it("handles trailing slashes", () => {
    expect(sanitizeProjectPath("/app/myproject/")).toBe("myproject");
  });

  it("strips non-alphanumeric characters", () => {
    expect(sanitizeProjectPath("/home/user/my project (v2)")).toBe("my_project__v2_");
  });

  it("returns 'unknown' for empty path", () => {
    expect(sanitizeProjectPath("")).toBe("unknown");
  });

  it("handles single segment path", () => {
    expect(sanitizeProjectPath("myproject")).toBe("myproject");
  });
});

// ── normalizeFrictionKeys ──

describe("normalizeFrictionKeys", () => {
  it("normalizes tool_environment_issue to tool_environment_issues", () => {
    expect(normalizeFrictionKeys({ tool_environment_issue: 3 })).toEqual({ tool_environment_issues: 3 });
  });

  it("merges aliased keys with existing canonical keys", () => {
    const result = normalizeFrictionKeys({
      tool_environment_issue: 2,
      tool_environment_issues: 1,
    });
    expect(result).toEqual({ tool_environment_issues: 3 });
  });

  it("passes through unknown keys unchanged", () => {
    expect(normalizeFrictionKeys({ wrong_approach: 5 })).toEqual({ wrong_approach: 5 });
  });

  it("handles empty input", () => {
    expect(normalizeFrictionKeys({})).toEqual({});
  });
});

// ── getAIPhase ──

describe("getAIPhase", () => {
  it("returns insufficient for < 10 meta sessions", () => {
    expect(getAIPhase(0)).toBe("insufficient");
    expect(getAIPhase(9)).toBe("insufficient");
  });

  it("returns early for 10-30 meta sessions", () => {
    expect(getAIPhase(10)).toBe("early");
    expect(getAIPhase(30)).toBe("early");
  });

  it("returns full for > 30 meta sessions", () => {
    expect(getAIPhase(31)).toBe("full");
    expect(getAIPhase(100)).toBe("full");
  });
});

// ── assembleEvidence ──

describe("assembleEvidence", () => {
  it("returns valid evidence with meta-only (no facets dir)", () => {
    for (let i = 0; i < 12; i++) {
      writeJson(META_DIR, `s${i}.json`, makeMeta(`s${i}`));
    }
    const result = assembleEvidence(META_DIR);
    expect(result).not.toBeNull();
    expect(result!.metaCount).toBe(12);
    expect(result!.facetCount).toBe(0);
    expect(result!.sessions).toHaveLength(12);
    for (const s of result!.sessions) {
      expect(s.facet).toBeNull();
      expect(s.meta.session_id).toBeTruthy();
    }
  });

  it("assembles evidence from meta + facets with proper join", () => {
    for (let i = 0; i < 12; i++) {
      writeJson(META_DIR, `s${i}.json`, makeMeta(`s${i}`));
      writeJson(FACETS_DIR, `s${i}.json`, makeFacet(`s${i}`));
    }
    const result = assembleEvidence(META_DIR, FACETS_DIR);
    expect(result).not.toBeNull();
    expect(result!.metaCount).toBe(12);
    expect(result!.facetCount).toBe(12);
    expect(result!.coverage).toBe(100);
    expect(result!.sessions).toHaveLength(12);
    for (const s of result!.sessions) {
      expect(s.facet).not.toBeNull();
      expect(s.meta.session_id).toBe(s.facet!.session_id);
    }
  });

  it("returns null when zero valid meta files", () => {
    // No meta files at all
    const result = assembleEvidence(META_DIR);
    expect(result).toBeNull();
  });

  it("returns null when meta dir does not exist", () => {
    expect(assembleEvidence("/nonexistent/meta")).toBeNull();
  });

  it("skips corrupt meta files and counts them", () => {
    for (let i = 0; i < 5; i++) {
      writeJson(META_DIR, `s${i}.json`, makeMeta(`s${i}`));
    }
    writeFileSync(join(META_DIR, "corrupt1.json"), "not json");
    writeFileSync(join(META_DIR, "corrupt2.json"), "{bad json");

    const result = assembleEvidence(META_DIR);
    expect(result).not.toBeNull();
    expect(result!.metaCount).toBe(5);
    expect(result!.corruptMeta).toBe(2);
  });

  it("skips corrupt facet files and counts them", () => {
    for (let i = 0; i < 5; i++) {
      writeJson(META_DIR, `s${i}.json`, makeMeta(`s${i}`));
      writeJson(FACETS_DIR, `s${i}.json`, makeFacet(`s${i}`));
    }
    writeFileSync(join(FACETS_DIR, "corrupt.json"), "not json");

    const result = assembleEvidence(META_DIR, FACETS_DIR);
    expect(result).not.toBeNull();
    expect(result!.facetCount).toBe(5);
    expect(result!.corruptFacets).toBe(1);
  });

  it("detects warmup sessions from meta first_prompt", () => {
    for (let i = 0; i < 5; i++) {
      const prompt = i < 2 ? "Respond with OK" : "Fix a real bug";
      writeJson(META_DIR, `s${i}.json`, makeMeta(`s${i}`, { first_prompt: prompt }));
    }

    const result = assembleEvidence(META_DIR);
    expect(result).not.toBeNull();
    expect(result!.warmupCount).toBe(2);
    expect(result!.productiveCount).toBe(3);
  });

  it("sorts sessions by start_time", () => {
    writeJson(META_DIR, "s1.json", makeMeta("s1", { start_time: "2026-03-20T12:00:00Z" }));
    writeJson(META_DIR, "s2.json", makeMeta("s2", { start_time: "2026-03-20T08:00:00Z" }));
    writeJson(META_DIR, "s3.json", makeMeta("s3", { start_time: "2026-03-20T10:00:00Z" }));

    const result = assembleEvidence(META_DIR);
    expect(result).not.toBeNull();
    const ids = result!.sessions.map((s) => s.meta.session_id);
    expect(ids).toEqual(["s2", "s3", "s1"]);
  });

  it("sanitizes project paths in sessions", () => {
    for (let i = 0; i < 3; i++) {
      writeJson(META_DIR, `s${i}.json`, makeMeta(`s${i}`, { project_path: "/home/user/my-app" }));
    }

    const result = assembleEvidence(META_DIR);
    expect(result).not.toBeNull();
    for (const session of result!.sessions) {
      expect(session.project).toBe("my-app");
    }
  });

  it("normalizes friction keys in facets during assembly", () => {
    for (let i = 0; i < 3; i++) {
      writeJson(META_DIR, `s${i}.json`, makeMeta(`s${i}`));
      writeJson(FACETS_DIR, `s${i}.json`, makeFacet(`s${i}`, {
        friction_counts: { tool_environment_issue: 1 },
      }));
    }

    const result = assembleEvidence(META_DIR, FACETS_DIR);
    expect(result).not.toBeNull();
    for (const session of result!.sessions) {
      expect(session.facet!.friction_counts).toEqual({ tool_environment_issues: 1 });
    }
  });

  it("LEFT JOINs facets — meta without matching facet gets null facet", () => {
    // 5 meta files, only 3 have matching facets
    for (let i = 0; i < 5; i++) {
      writeJson(META_DIR, `s${i}.json`, makeMeta(`s${i}`));
    }
    for (let i = 0; i < 3; i++) {
      writeJson(FACETS_DIR, `s${i}.json`, makeFacet(`s${i}`));
    }

    const result = assembleEvidence(META_DIR, FACETS_DIR);
    expect(result).not.toBeNull();
    expect(result!.sessions).toHaveLength(5);
    const withFacet = result!.sessions.filter((s) => s.facet !== null);
    const withoutFacet = result!.sessions.filter((s) => s.facet === null);
    expect(withFacet).toHaveLength(3);
    expect(withoutFacet).toHaveLength(2);
    expect(result!.facetCount).toBe(3);
    expect(result!.coverage).toBe(60);
  });

  it("ignores meta entries without session_id", () => {
    writeJson(META_DIR, "valid.json", makeMeta("s1"));
    writeJson(META_DIR, "noid.json", { project_path: "/app/test", duration_minutes: 5 });

    const result = assembleEvidence(META_DIR);
    expect(result).not.toBeNull();
    expect(result!.sessions).toHaveLength(1);
  });
});

// ── precomputeStats ──

describe("precomputeStats", () => {
  function makeEvidence(count: number, opts: { withFacets?: boolean } = {}): GradingEvidence {
    const withFacets = opts.withFacets ?? true;
    const sessions: MatchedSession[] = [];
    for (let i = 0; i < count; i++) {
      const isAchieved = i < count * 0.8;
      sessions.push({
        facet: withFacets ? {
          session_id: `s${i}`,
          outcome: isAchieved ? "fully_achieved" : "partially_achieved",
          session_type: i % 3 === 0 ? "iterative_refinement" : "multi_task",
          friction_counts: i % 4 === 0 ? { wrong_approach: 1 } : {},
          user_satisfaction_counts: isAchieved ? { likely_satisfied: 1 } : { likely_unsatisfied: 1 },
          claude_helpfulness: "very_helpful",
          first_prompt: i === 0 ? "Respond with OK" : "Fix a bug",
        } as never : null,
        meta: {
          session_id: `s${i}`,
          project_path: `/app/project${i % 3}`,
          start_time: `2026-03-${String(20 + i).padStart(2, "0")}T10:00:00Z`,
          duration_minutes: 15,
          tool_counts: { Read: 2, Edit: 1 },
          git_commits: 1,
          git_pushes: 0,
          input_tokens: 50000,
          output_tokens: 2000,
          first_prompt: i === 0 ? "Respond with OK" : "Fix a bug",
          lines_added: 30,
          files_modified: 2,
        } as never,
        project: `project${i % 3}`,
      });
    }
    return {
      sessions,
      metaCount: count,
      facetCount: withFacets ? count : 0,
      corruptMeta: 0,
      corruptFacets: 0,
      productiveCount: count - 1,
      warmupCount: 1,
      coverage: withFacets ? 100 : 0,
    };
  }

  it("computes outcome distribution from facets", () => {
    const stats = precomputeStats(makeEvidence(20));
    expect(stats.outcomes["fully_achieved"]).toBe(16);
    expect(stats.outcomes["partially_achieved"]).toBe(4);
  });

  it("computes achieved rate", () => {
    const stats = precomputeStats(makeEvidence(20));
    expect(stats.achievedRate).toBe(80);
  });

  it("computes friction totals and trends from facets", () => {
    const stats = precomputeStats(makeEvidence(20));
    expect(stats.frictionTotals["wrong_approach"]).toBeGreaterThan(0);
    expect(typeof stats.frictionFirstHalf).toBe("object");
    expect(typeof stats.frictionSecondHalf).toBe("object");
  });

  it("computes tool totals from meta", () => {
    const stats = precomputeStats(makeEvidence(10));
    expect(stats.toolTotals["Read"]).toBe(20);
    expect(stats.toolTotals["Edit"]).toBe(10);
  });

  it("computes session type distribution from facets", () => {
    const stats = precomputeStats(makeEvidence(10));
    expect(stats.sessionTypes["iterative_refinement"]).toBeGreaterThan(0);
    expect(stats.sessionTypes["multi_task"]).toBeGreaterThan(0);
  });

  it("computes git activity totals from meta", () => {
    const stats = precomputeStats(makeEvidence(10));
    expect(stats.gitCommitsTotal).toBe(10);
    expect(stats.gitPushesTotal).toBe(0);
  });

  it("computes satisfaction rate from facets", () => {
    const stats = precomputeStats(makeEvidence(20));
    expect(stats.satisfiedRate).toBe(80);
  });

  it("computes average duration from meta", () => {
    const stats = precomputeStats(makeEvidence(10));
    expect(stats.avgDurationMinutes).toBe(15);
  });

  it("computes token totals from meta", () => {
    const stats = precomputeStats(makeEvidence(10));
    expect(stats.totalInputTokens).toBe(500000);
    expect(stats.totalOutputTokens).toBe(20000);
  });

  it("counts warmup sessions", () => {
    const stats = precomputeStats(makeEvidence(10));
    expect(stats.warmupCount).toBe(1);
  });

  it("computes projectDistribution from session projects", () => {
    const stats = precomputeStats(makeEvidence(9));
    // 9 sessions across 3 projects (i%3): project0=3, project1=3, project2=3
    expect(stats.projectDistribution["project0"]).toBe(3);
    expect(stats.projectDistribution["project1"]).toBe(3);
    expect(stats.projectDistribution["project2"]).toBe(3);
  });

  it("computes toolActivitySessions and avgToolDiversity", () => {
    const stats = precomputeStats(makeEvidence(10));
    // Every session has tool_counts { Read, Edit } — 2 keys each
    expect(stats.toolActivitySessions).toBe(10);
    expect(stats.avgToolDiversity).toBe(2);
  });

  it("computes coverageFlags", () => {
    const stats = precomputeStats(makeEvidence(25));
    expect(stats.coverageFlags.hasFacets).toBe(true);
    expect(stats.coverageFlags.facetCoverage).toBeGreaterThan(0);
    expect(stats.coverageFlags.sufficientForTrends).toBe(true);
  });

  it("handles zero facets without crashing", () => {
    const stats = precomputeStats(makeEvidence(10, { withFacets: false }));
    expect(stats.sessionCount).toBe(10);
    expect(stats.outcomes).toEqual({});
    expect(stats.sessionTypes).toEqual({});
    expect(stats.satisfiedRate).toBe(0);
    expect(stats.achievedRate).toBe(0);
    expect(stats.coverageFlags.hasFacets).toBe(false);
    expect(stats.coverageFlags.sufficientForTrends).toBe(false);
    // Meta-derived stats should still be present
    expect(stats.toolTotals["Read"]).toBe(20);
    expect(stats.gitCommitsTotal).toBe(10);
    expect(stats.totalInputTokens).toBe(500000);
  });

  it("includes facet stats when facets are available", () => {
    const stats = precomputeStats(makeEvidence(20));
    // Facet-derived fields should be populated
    expect(Object.keys(stats.outcomes).length).toBeGreaterThan(0);
    expect(Object.keys(stats.sessionTypes).length).toBeGreaterThan(0);
    expect(Object.keys(stats.helpfulness).length).toBeGreaterThan(0);
    expect(stats.satisfiedRate).toBeGreaterThan(0);
  });
});

// ── buildEvidencePayload ──

describe("buildEvidencePayload", () => {
  function makeStats(overrides: Partial<SessionMetaStats> = {}): SessionMetaStats {
    return {
      outcomes: { fully_achieved: 8, partially_achieved: 2 },
      achievedRate: 80,
      frictionTotals: { wrong_approach: 3 },
      frictionFirstHalf: { wrong_approach: 2 },
      frictionSecondHalf: { wrong_approach: 1 },
      toolTotals: { Read: 20, Edit: 10 },
      sessionTypes: { iterative_refinement: 6, multi_task: 4 },
      gitCommitsTotal: 5,
      gitPushesTotal: 2,
      satisfactionCounts: { likely_satisfied: 8, likely_unsatisfied: 2 },
      satisfiedRate: 80,
      helpfulness: { very_helpful: 8, helpful: 2 },
      avgDurationMinutes: 15,
      totalInputTokens: 500000,
      totalOutputTokens: 20000,
      totalLinesAdded: 300,
      totalFilesModified: 20,
      sessionCount: 10,
      coveragePercent: 100,
      warmupCount: 1,
      projectDistribution: { myapp: 10 },
      toolActivitySessions: 10,
      avgToolDiversity: 3,
      coverageFlags: { hasFacets: true, facetCoverage: 100, sufficientForTrends: false },
      ...overrides,
    };
  }

  it("includes all key sections in the payload", () => {
    const payload = buildEvidencePayload(makeStats(), stubConfig());

    // Header
    expect(payload).toContain("SESSION COVERAGE: 10 total, 9 non-warmup, 1 warmup (10%)");
    expect(payload).toContain("FACET COVERAGE:");

    // Tier 1: Quantitative (always present)
    expect(payload).toContain("TIER 1: QUANTITATIVE");
    expect(payload).toContain("TOOL ACTIVITY: 10 sessions with tool use");
    expect(payload).toContain("TOOL DISTRIBUTION:");
    expect(payload).toContain("TOKEN TOTALS: input=500000, output=20000");
    expect(payload).toContain("PROJECT DISTRIBUTION:");
    expect(payload).toContain("GIT: 5 commits, 2 pushes");

    // Tier 2: Qualitative (present when hasFacets=true)
    expect(payload).toContain("TIER 2: QUALITATIVE");
    expect(payload).toContain("OUTCOME DISTRIBUTION:");
    expect(payload).toContain("ACHIEVED RATE: 80%");
    expect(payload).toContain("SATISFACTION:");
    expect(payload).toContain("FRICTION TOTALS:");
    expect(payload).toContain("FRICTION TREND:");
    expect(payload).toContain("SESSION TYPES:");

    // Coverage flags
    expect(payload).toContain("COVERAGE FLAGS");
    expect(payload).toContain("FACET_AVAILABLE: true");
    expect(payload).toContain("FACET_COVERAGE: 100%");
  });

  it("includes rule-based scores in Tier 3 when provided", () => {
    const ruleScores = [
      { id: "cc-mastery" as const, label: "CC Mastery", score: 60, maxPossible: 100, percentage: 60, weight: 0.25, confidence: "high" as const, dataPoints: 50 },
      { id: "tool-mcp" as const, label: "Tool & MCP", score: 45, maxPossible: 100, percentage: 45, weight: 0.25, confidence: "medium" as const, dataPoints: 20 },
    ];

    const payload = buildEvidencePayload(makeStats(), stubConfig(), ruleScores);
    expect(payload).toContain("TIER 3: RULE ENGINE FEATURES");
    expect(payload).toContain("RULE-BASED DOMAIN SCORES:");
    expect(payload).toContain("cc-mastery=60%");
    expect(payload).toContain("tool-mcp=45%");
    expect(payload).toContain("CONFIG:");
  });

  it("omits Tier 2 when no facets available", () => {
    const noFacetStats = makeStats({
      coverageFlags: { hasFacets: false, facetCoverage: 0, sufficientForTrends: false },
    });
    const payload = buildEvidencePayload(noFacetStats, stubConfig());
    expect(payload).toContain("TIER 1: QUANTITATIVE");
    expect(payload).not.toContain("TIER 2: QUALITATIVE");
    expect(payload).toContain("FACET_AVAILABLE: false");
  });

  it("omits Tier 3 when no rule scores provided", () => {
    const payload = buildEvidencePayload(makeStats(), stubConfig());
    expect(payload).not.toContain("TIER 3");
    expect(payload).not.toContain("RULE-BASED DOMAIN SCORES");
  });
});

// ── computeAIEvidence ──

describe("computeAIEvidence", () => {
  function makeEvidenceWithFacets(): { evidence: GradingEvidence; stats: SessionMetaStats } {
    const sessions: MatchedSession[] = [];
    for (let i = 0; i < 25; i++) {
      sessions.push({
        meta: {
          session_id: `s${i}`,
          first_prompt: `Prompt ${i} with some words for length`,
        } as never,
        facet: {
          session_id: `s${i}`,
          outcome: i < 20 ? "fully_achieved" : "partially_achieved",
          friction_counts: i % 3 === 0 ? { wrong_approach: 1 } : {},
          user_satisfaction_counts: i < 20 ? { likely_satisfied: 1 } : {},
          first_prompt: `Prompt ${i} with some words for length`,
        } as never,
        project: "test",
      });
    }
    const evidence: GradingEvidence = {
      sessions,
      metaCount: 25,
      facetCount: 25,
      corruptMeta: 0,
      corruptFacets: 0,
      productiveCount: 25,
      warmupCount: 0,
      coverage: 100,
    };
    const stats = precomputeStats(evidence);
    return { evidence, stats };
  }

  it("computes achievedRate from stats", () => {
    const { evidence, stats } = makeEvidenceWithFacets();
    const result = computeAIEvidence(evidence, stats);
    expect(result.achievedRate).toBe(stats.achievedRate);
  });

  it("counts frictionSatisfied sessions", () => {
    const { evidence, stats } = makeEvidenceWithFacets();
    const result = computeAIEvidence(evidence, stats);
    // Sessions with friction>0 AND achieved AND satisfied
    expect(result.frictionSatisfiedCount).toBeGreaterThan(0);
  });

  it("computes promptLengthTrend when >= 20 prompts", () => {
    const { evidence, stats } = makeEvidenceWithFacets();
    const result = computeAIEvidence(evidence, stats);
    // All prompts are similar length, so trend should be near 0
    expect(typeof result.promptLengthTrend).toBe("number");
  });

  it("returns zeros when no facets available", () => {
    const sessions: MatchedSession[] = [];
    for (let i = 0; i < 25; i++) {
      sessions.push({
        meta: {
          session_id: `s${i}`,
          first_prompt: `Prompt ${i} with some words`,
        } as never,
        facet: null,
        project: "test",
      });
    }
    const evidence: GradingEvidence = {
      sessions,
      metaCount: 25,
      facetCount: 0,
      corruptMeta: 0,
      corruptFacets: 0,
      productiveCount: 25,
      warmupCount: 0,
      coverage: 0,
    };
    const stats = precomputeStats(evidence);
    const result = computeAIEvidence(evidence, stats);
    expect(result.achievedRate).toBe(0);
    expect(result.frictionSatisfiedCount).toBe(0);
  });

  it("returns zero trend when fewer than 20 prompts", () => {
    const sessions: MatchedSession[] = [];
    for (let i = 0; i < 10; i++) {
      sessions.push({
        meta: { session_id: `s${i}`, first_prompt: "Short prompt" } as never,
        facet: null,
        project: "test",
      });
    }
    const evidence: GradingEvidence = {
      sessions,
      metaCount: 10,
      facetCount: 0,
      corruptMeta: 0,
      corruptFacets: 0,
      productiveCount: 10,
      warmupCount: 0,
      coverage: 0,
    };
    const stats = precomputeStats(evidence);
    const result = computeAIEvidence(evidence, stats);
    expect(result.promptLengthTrend).toBe(0);
  });
});
