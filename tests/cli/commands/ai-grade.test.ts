import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AIGradingResult, ParsedRubric } from "../../../src/types.js";
import type { GradingEvidence, PrecomputedStats } from "../../../src/scoring/ai-evidence.js";
import type { AICriteriaResponse } from "../../../src/scoring/ai-grader.js";

// ── Mocks ──

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return { ...actual, existsSync: vi.fn(() => true), statSync: vi.fn(() => ({ mtime: new Date("2026-03-01") })) };
});

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return { ...actual, homedir: () => "/tmp/cc-prof-ai-test" };
});

vi.mock("../../../src/scoring/ai-grader.js", () => ({
  checkClaudeVersion: vi.fn(() => true),
  gradeWithClaude: vi.fn(() => ({ response: MOCK_RAW_RESPONSE, actualModel: "claude-sonnet-4-6" })),
  postProcess: vi.fn(() => MOCK_RESULT),
  computeCacheKey: vi.fn(() => "test-cache-key"),
}));

vi.mock("../../../src/scoring/rubric-loader.js", () => ({
  loadRubric: vi.fn(() => MOCK_RUBRIC),
  buildPromptFromRubric: vi.fn(() => "rubric-prompt-text"),
}));

vi.mock("../../../src/scoring/ai-evidence.js", () => ({
  assembleEvidence: vi.fn(() => MOCK_EVIDENCE),
  precomputeStats: vi.fn(() => MOCK_STATS),
  buildEvidencePayload: vi.fn(() => "evidence-payload"),
  getAIPhase: vi.fn(() => "full"),
  computeAIEvidence: vi.fn(() => ({ achievedRate: 70, frictionSatisfiedCount: 3, promptLengthTrend: 2 })),
}));

vi.mock("../../../src/renderer/ai-animated-svg.js", () => ({
  renderAIAnimatedBadge: vi.fn(() => "<svg>ai-badge</svg>"),
}));

const MOCK_PROFICIENCY_RESULT = {
  username: "testuser", timestamp: "2026-03-01T00:00:00Z", domains: [],
  features: { totalHours: 10, topTools: [], uniqueToolCount: 0, hooks: [], skills: [], mcpServers: [], usedPlanMode: false, hasMemory: false, hasRules: false, hasAgents: false, hasSkills: false },
  sessionCount: 50, projectCount: 3, phase: "full", setupChecklist: [],
};

vi.mock("../../../src/store/local-store.js", () => ({
  loadStore: vi.fn(() => ({ processedSessionIds: [], snapshots: [], lastResult: MOCK_PROFICIENCY_RESULT })),
  saveStore: vi.fn(),
  loadConfig: vi.fn(() => ({ autoUpload: true, public: false, aiGrading: true })),
  saveAIBadge: vi.fn(() => "/tmp/cc-prof-ai-test/.cc-proficiency/cc-proficiency-animated-ai-graded.svg"),
  computeTokenWindows: vi.fn(() => undefined),
}));

vi.mock("../../../src/store/queue.js", () => ({
  acquireAIGradeLock: vi.fn(() => true),
  releaseAIGradeLock: vi.fn(),
}));

vi.mock("../../../src/parsers/config-parser.js", () => ({
  parseClaudeConfig: vi.fn(() => ({
    hasGlobalClaudeMd: false, globalClaudeMdHasImports: false, projectClaudeMdCount: 0,
    hasCustomHooks: false, hookWithMatcherCount: 0, pluginCount: 0, pluginNames: [],
    hasRulesFiles: false, rulesFileCount: 0, hasMcpServers: false,
    hasMemoryFiles: false, memoryFileCount: 0, activeMemoryFileCount: 0,
    effortLevel: "normal", hasCustomAgents: false, hasCustomSkills: false,
  })),
}));

vi.mock("../../../src/i18n/index.js", () => ({
  t: () => ({
    cli: {
      aiGrade: {
        running: "Running AI grading... This may take about 3-10 minutes...",
        insufficientFacets: (c: number, r: number) => `Insufficient: ${c} facets (need ${r}+)`,
        cacheHit: "Using cached result.",
        gradingComplete: "AI grading complete.",
        domainResult: (l: string, s: number, lv: string) => `  ${l}: ${s}% (${lv})`,
        badgeSaved: (p: string) => `Badge saved to ${p}`,
        claudeNotFound: "Claude CLI not found.",
        claudeAuthFailed: "Auth failed.",
        gradingFailed: (e: string) => `Failed: ${e}`,
      },
    },
    aiBadge: {
      aiDomainLabels: {
        "goal-achievement": "Goal Achievement",
        "collaboration-quality": "Collaboration",
        "workflow-mastery": "Workflow",
        "growth-learning": "Growth",
        "verification-quality": "Verification",
      },
    },
  }),
  initLocale: vi.fn(),
}));

import { existsSync } from "node:fs";
import { checkClaudeVersion, gradeWithClaude, postProcess, computeCacheKey } from "../../../src/scoring/ai-grader.js";
import { assembleEvidence, getAIPhase } from "../../../src/scoring/ai-evidence.js";
import { loadStore, saveStore, saveAIBadge } from "../../../src/store/local-store.js";
import { acquireAIGradeLock, releaseAIGradeLock } from "../../../src/store/queue.js";
import { cmdAIGrade } from "../../../src/cli/commands/ai-grade.js";

// ── Fixtures ──

const MOCK_RUBRIC: ParsedRubric = {
  domains: [
    { id: "goal-achievement", label: "Goal Achievement", description: "d", criteria: [{ q: "Q1", title: "t", anchors: "a", evidence: "e" }] },
  ],
  antiGaming: "",
  systemPromptHeader: "",
};

const MOCK_EVIDENCE: GradingEvidence = {
  sessions: [], facetCount: 50, metaCount: 40, corruptFacets: 2, corruptMeta: 1, productiveCount: 38, warmupCount: 2, coverage: 80,
};

const MOCK_STATS: PrecomputedStats = {
  outcomes: {}, achievedRate: 70, frictionTotals: {}, frictionFirstHalf: {}, frictionSecondHalf: {},
  toolTotals: {}, sessionTypes: {}, gitCommitsTotal: 10, gitPushesTotal: 5,
  satisfactionCounts: {}, satisfiedRate: 60, avgDurationMinutes: 15,
  totalInputTokens: 1000, totalOutputTokens: 500, totalLinesAdded: 200, totalFilesModified: 30,
  sessionCount: 50, coveragePercent: 80, helpfulness: {}, warmupCount: 3,
  projectDistribution: {}, toolActivitySessions: 40, avgToolDiversity: 3.5,
  coverageFlags: { hasFacets: true, facetCoverage: 80, sufficientForTrends: true },
};

const MOCK_RAW_RESPONSE: AICriteriaResponse = {
  domains: [
    { id: "goal-achievement", criteria: [{ q: "Q1", score: 4, evidence: "good" }] },
    { id: "collaboration-quality", criteria: [{ q: "Q1", score: 3, evidence: "ok" }] },
    { id: "workflow-mastery", criteria: [{ q: "Q1", score: 5, evidence: "great" }] },
    { id: "growth-learning", criteria: [{ q: "Q1", score: 3, evidence: "ok" }] },
    { id: "verification-quality", criteria: [{ q: "Q1", score: 4, evidence: "good" }] },
  ],
};

const MOCK_RESULT: AIGradingResult = {
  domains: [
    { id: "goal-achievement", criteria: [{ question: "Q1", score: 4, evidence: "good" }], total: 75, level: "expert", summary: "Goal Achievement: expert (75%)" },
    { id: "collaboration-quality", criteria: [{ question: "Q1", score: 3, evidence: "ok" }], total: 50, level: "proficient", summary: "Collaboration: proficient (50%)" },
    { id: "workflow-mastery", criteria: [{ question: "Q1", score: 5, evidence: "great" }], total: 100, level: "expert", summary: "Workflow: expert (100%)" },
    { id: "growth-learning", criteria: [{ question: "Q1", score: 3, evidence: "ok" }], total: 50, level: "proficient", summary: "Growth: proficient (50%)" },
    { id: "verification-quality", criteria: [{ question: "Q1", score: 4, evidence: "good" }], total: 75, level: "expert", summary: "Verification: expert (75%)" },
  ],
  overall: "Overall: proficient (70% average)",
  model: "sonnet",
  gradedAt: "2026-03-01T00:00:00.000Z",
  rubricVersion: "test-cache-key",
};

// ── Tests ──

describe("cmdAIGrade", () => {
  let consoleLogs: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogs = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => { consoleLogs.push(String(msg)); });
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(acquireAIGradeLock).mockReturnValue(true);
    vi.mocked(checkClaudeVersion).mockReturnValue(true);
    vi.mocked(assembleEvidence).mockReturnValue(MOCK_EVIDENCE);
    vi.mocked(getAIPhase).mockReturnValue("full");
    vi.mocked(gradeWithClaude).mockReturnValue({ response: MOCK_RAW_RESPONSE, actualModel: "claude-sonnet-4-6" });
    vi.mocked(postProcess).mockReturnValue(MOCK_RESULT);
    vi.mocked(computeCacheKey).mockReturnValue("test-cache-key");
    vi.mocked(loadStore).mockReturnValue({ processedSessionIds: [], snapshots: [], lastResult: MOCK_PROFICIENCY_RESULT });
  });

  it("runs full grading pipeline", async () => {
    await cmdAIGrade([]);
    expect(checkClaudeVersion).toHaveBeenCalled();
    expect(assembleEvidence).toHaveBeenCalled();
    expect(gradeWithClaude).toHaveBeenCalled();
    expect(postProcess).toHaveBeenCalled();
    expect(saveAIBadge).toHaveBeenCalledWith("<svg>ai-badge</svg>");
    expect(saveStore).toHaveBeenCalled();
    expect(consoleLogs.some(l => l.includes("AI grading complete"))).toBe(true);
  });

  it("exits when Claude CLI not found", async () => {
    vi.mocked(checkClaudeVersion).mockReturnValue(false);
    await cmdAIGrade([]);
    expect(gradeWithClaude).not.toHaveBeenCalled();
    expect(consoleLogs.some(l => l.includes("Claude CLI not found"))).toBe(true);
  });

  it("exits when meta directory missing", async () => {
    vi.mocked(existsSync).mockReturnValue(false);
    await cmdAIGrade([]);
    expect(gradeWithClaude).not.toHaveBeenCalled();
    expect(consoleLogs.some(l => l.includes("Insufficient"))).toBe(true);
  });

  it("exits on insufficient phase", async () => {
    vi.mocked(getAIPhase).mockReturnValue("insufficient");
    await cmdAIGrade([]);
    expect(gradeWithClaude).not.toHaveBeenCalled();
  });

  it("uses cache when keys match", async () => {
    const cachedResult = { ...MOCK_RESULT, cacheKey: "test-cache-key" };
    vi.mocked(loadStore).mockReturnValue({
      processedSessionIds: [], snapshots: [], lastResult: MOCK_PROFICIENCY_RESULT, lastAIResult: cachedResult,
    });
    await cmdAIGrade([]);
    expect(gradeWithClaude).not.toHaveBeenCalled();
    expect(consoleLogs.some(l => l.includes("cached"))).toBe(true);
  });

  it("--full forces re-grade even with cache match", async () => {
    const cachedResult = { ...MOCK_RESULT, cacheKey: "test-cache-key" };
    vi.mocked(loadStore).mockReturnValue({
      processedSessionIds: [], snapshots: [], lastResult: MOCK_PROFICIENCY_RESULT, lastAIResult: cachedResult,
    });
    await cmdAIGrade(["--full"]);
    expect(gradeWithClaude).toHaveBeenCalled();
  });

  it("passes --model flag to gradeWithClaude", async () => {
    await cmdAIGrade(["--model", "haiku"]);
    expect(gradeWithClaude).toHaveBeenCalledWith("rubric-prompt-text", "evidence-payload", "haiku");
  });

  it("handles grading failure gracefully", async () => {
    vi.mocked(gradeWithClaude).mockReturnValue(null);
    await cmdAIGrade([]);
    expect(saveStore).not.toHaveBeenCalled();
    expect(consoleLogs.some(l => l.includes("Failed"))).toBe(true);
  });

  it("handles post-process error gracefully", async () => {
    vi.mocked(postProcess).mockImplementation(() => { throw new Error("bad domain"); });
    await cmdAIGrade([]);
    expect(saveStore).not.toHaveBeenCalled();
    expect(consoleLogs.some(l => l.includes("bad domain"))).toBe(true);
  });

  it("grades successfully when facets directory missing", async () => {
    // META_DIR exists but assembleEvidence returns evidence with facetCount=0
    const noFacetsEvidence: GradingEvidence = {
      sessions: [], facetCount: 0, metaCount: 40, corruptFacets: 0, corruptMeta: 1, productiveCount: 38, warmupCount: 2, coverage: 0,
    };
    vi.mocked(assembleEvidence).mockReturnValue(noFacetsEvidence);
    await cmdAIGrade([]);
    expect(assembleEvidence).toHaveBeenCalled();
    expect(gradeWithClaude).toHaveBeenCalled();
    expect(postProcess).toHaveBeenCalled();
    expect(saveStore).toHaveBeenCalled();
    expect(consoleLogs.some(l => l.includes("AI grading complete"))).toBe(true);
  });
});
