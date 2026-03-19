import { describe, it, expect } from "vitest";
import { renderBadge, getInsights } from "../../src/renderer/svg.js";
import type { ProficiencyResult, FeatureInventory } from "../../src/types.js";

const defaultFeatures: FeatureInventory = {
  hooks: [{ name: "security-gate", count: 45 }, { name: "stop-reminder", count: 45 }, { name: "test-quality", count: 20 }],
  skills: [{ name: "commit", count: 12 }, { name: "proficiency", count: 5 }, { name: "review-pr", count: 3 }],
  mcpServers: ["github", "context7"],
  topTools: [{ name: "Read", count: 1200 }, { name: "Edit", count: 890 }, { name: "Bash", count: 520 }, { name: "Grep", count: 340 }, { name: "Agent", count: 61 }],
  totalToolCalls: 4284,
  uniqueToolCount: 16,
  usedPlanMode: true,
  hasMemory: true,
  hasRules: false,
  hasAgents: false,
  hasSkills: false,
};

function makeResult(overrides: Partial<ProficiencyResult> = {}): ProficiencyResult {
  return {
    username: "testuser",
    timestamp: "2026-03-16T12:00:00Z",
    domains: [
      { id: "cc-mastery", label: "CC Mastery", score: 78, weight: 0.2, confidence: "high", dataPoints: 50 },
      { id: "tool-mcp", label: "Tool & MCP", score: 55, weight: 0.2, confidence: "medium", dataPoints: 25 },
      { id: "agentic", label: "Agentic", score: 82, weight: 0.2, confidence: "high", dataPoints: 60 },
      { id: "prompt-craft", label: "Prompt Craft", score: 65, weight: 0.2, confidence: "high", dataPoints: 55 },
      { id: "context-mgmt", label: "Context Mgmt", score: 90, weight: 0.2, confidence: "high", dataPoints: 45 },
    ],
    features: defaultFeatures,
    sessionCount: 47,
    projectCount: 3,
    phase: "full",
    setupChecklist: {
      hasClaudeMd: true, hasHooks: true, hasPlugins: true,
      hasMcpServers: true, hasMemory: true, hasRules: false,
      hasAgents: false, hasSkills: false,
    },
    ...overrides,
  };
}

describe("renderBadge", () => {
  it("renders calibrating badge for < 3 sessions", () => {
    const result = makeResult({ phase: "calibrating", sessionCount: 2 });
    const svg = renderBadge(result);

    expect(svg).toContain("<svg");
    expect(svg).toContain("Analyzing usage patterns");
    expect(svg).toContain("@testuser");
    expect(svg).toContain("Need 1 more");
  });

  it("renders full badge with domain bars", () => {
    const svg = renderBadge(makeResult());

    expect(svg).toContain("CC Mastery");
    expect(svg).toContain("Agentic");
    expect(svg).toContain("Prompt Craft");
    expect(svg).toContain("Context Mgmt");
    expect(svg).toContain("78");
    expect(svg).toContain("55");
  });

  it("includes 8 feature mini-bars and tool summary", () => {
    const svg = renderBadge(makeResult());

    // 8 mini-bar labels
    expect(svg).toContain("Hooks");
    expect(svg).toContain("Plugins");
    expect(svg).toContain("Skills");
    expect(svg).toContain("MCP");
    expect(svg).toContain("Agents");
    expect(svg).toContain("Plan");
    expect(svg).toContain("Memory");
    expect(svg).toContain("Rules");
    // All 8 in a single row
    expect(svg).not.toContain("Top Tools");
  });

  it("does not show overall score", () => {
    const svg = renderBadge(makeResult());
    expect(svg).not.toContain("Overall:");
    expect(svg).not.toContain("/100");
  });

  it("shows early results label for phase=early", () => {
    const result = makeResult({ phase: "early", sessionCount: 5 });
    const svg = renderBadge(result);
    expect(svg).toContain("early results");
  });

  it("includes confidence symbols", () => {
    const svg = renderBadge(makeResult());
    expect(svg).toContain("\u25CF"); // high
    expect(svg).toContain("\u25D0"); // medium
  });

  it("produces valid accessible SVG", () => {
    for (const phase of ["calibrating", "early", "full"] as const) {
      const result = makeResult({ phase });
      const svg = renderBadge(result);

      expect(svg).toMatch(/^<svg/);
      expect(svg).toMatch(/<\/svg>$/);
      expect(svg).toContain('role="img"');
      expect(svg).toContain("<title");
    }
  });

  it("escapes XML in user-controlled content", () => {
    const result = makeResult({ username: "test<script>alert(1)</script>" });
    const svg = renderBadge(result);

    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("escapes ampersand in domain labels", () => {
    const svg = renderBadge(makeResult());
    // "Tool & MCP" label should be escaped to "Tool &amp; MCP"
    expect(svg).toContain("Tool &amp; MCP");
  });

  it("renders feature flags", () => {
    const svg = renderBadge(makeResult());
    expect(svg).toContain("Plan");
    expect(svg).toContain("Memory");
  });
});

describe("renderBadge with tokenWindows", () => {
  it("shows token line when tokenWindows provided", () => {
    const svg = renderBadge(makeResult(), "en", { tokens24h: 1500000, tokens30d: 15300000 });
    expect(svg).toContain("tokens");
    expect(svg).toContain("1.5M/24h");
    expect(svg).toContain("15.3M/30d");
  });

  it("omits token line when tokenWindows undefined", () => {
    const svg = renderBadge(makeResult());
    expect(svg).not.toContain("tokens");
    expect(svg).not.toContain("/24h");
  });

  it("omits token line when both values are zero", () => {
    const svg = renderBadge(makeResult(), "en", { tokens24h: 0, tokens30d: 0 });
    expect(svg).not.toContain("tokens");
    expect(svg).not.toContain("/24h");
  });

  it("increases badge height when tokens present", () => {
    const svgWithout = renderBadge(makeResult());
    const svgWith = renderBadge(makeResult(), "en", { tokens24h: 1000, tokens30d: 5000 });
    const heightWithout = parseInt(svgWithout.match(/height="(\d+)"/)?.[1] ?? "0");
    const heightWith = parseInt(svgWith.match(/height="(\d+)"/)?.[1] ?? "0");
    expect(heightWith).toBeGreaterThan(heightWithout);
  });

  it("shows tokens on calibrating badge", () => {
    const result = makeResult({ phase: "calibrating", sessionCount: 1 });
    const svg = renderBadge(result, "en", { tokens24h: 500, tokens30d: 2000 });
    expect(svg).toContain("tokens");
    expect(svg).toContain("500/24h");
  });
});

describe("getInsights", () => {
  it("returns top strength from highest scoring domain", () => {
    const result = makeResult();
    const { topStrength } = getInsights(result);
    // Context Mgmt (90) is highest
    expect(topStrength).toBeDefined();
  });

  it("returns next action from lowest scoring domain", () => {
    const result = makeResult();
    const { nextAction } = getInsights(result);
    // Tool & MCP (55) is lowest
    expect(nextAction).toBeDefined();
  });
});
