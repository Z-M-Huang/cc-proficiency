import { describe, it, expect } from "vitest";
import { renderAnimatedBadge } from "../../src/renderer/animated-svg.js";
import type { ProficiencyResult, FeatureInventory } from "../../src/types.js";

const defaultFeatures: FeatureInventory = {
  hooks: [{ name: "security-gate", count: 45 }],
  skills: [{ name: "commit", count: 12 }],
  mcpServers: ["github"],
  topTools: [{ name: "Read", count: 1200 }],
  totalToolCalls: 4284,
  uniqueToolCount: 16,
  usedPlanMode: true,
  hasMemory: true,
  hasRules: false,
  hasAgents: false,
  hasSkills: false,
  featureScores: { hooks: 80, plugins: 65, skills: 90, mcp: 95, agents: 60, plan: 70, memory: 85, rules: 88 },
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

describe("renderAnimatedBadge", () => {
  it("contains SMIL animate elements for domain bars", () => {
    const svg = renderAnimatedBadge(makeResult());

    expect(svg).toContain("<animate");
    expect(svg).toContain('attributeName="width"');
    expect(svg).toContain('from="0"');
    expect(svg).toContain('fill="freeze"');
  });

  it("uses eased spline animation for bars", () => {
    const svg = renderAnimatedBadge(makeResult());
    expect(svg).toContain('calcMode="spline"');
    expect(svg).toContain("keySplines=");
  });

  it("staggers domain bar animations", () => {
    const svg = renderAnimatedBadge(makeResult());
    // First bar starts at 0.3s, each subsequent 0.2s later
    expect(svg).toContain('begin="0.3s"');
    expect(svg).toContain('begin="0.5s"');
    expect(svg).toContain('begin="0.7s"');
  });

  it("fades in score numbers after bars fill", () => {
    const svg = renderAnimatedBadge(makeResult());
    expect(svg).toContain('attributeName="opacity"');
    expect(svg).toContain('from="0" to="1"');
  });

  it("fades in mini-bar grid", () => {
    const svg = renderAnimatedBadge(makeResult());
    // Mini-bar labels should be present
    expect(svg).toContain("Hooks");
    expect(svg).toContain("MCP");
    expect(svg).toContain("Memory");
    // And should have fade-in animation
    const miniBarSection = svg.split("Hooks")[0]!;
    expect(miniBarSection).toContain('opacity="0"');
  });

  it("fades in footer", () => {
    const svg = renderAnimatedBadge(makeResult());
    expect(svg).toContain("47 sessions");
    expect(svg).toContain("github.com/Z-M-Huang/cc-proficiency");
  });

  it("has correct height matching static badge layout", () => {
    const svg = renderAnimatedBadge(makeResult());
    // 5 domains: separatorY=208, miniBarY=222, footerY=270, height=310
    expect(svg).toContain('height="310"');
    expect(svg).toContain('viewBox="0 0 495 310"');
  });

  it("falls back to calibrating badge for calibrating phase", () => {
    const result = makeResult({ phase: "calibrating", sessionCount: 2 });
    const svg = renderAnimatedBadge(result);

    // Calibrating badge has no animation — just the static version
    expect(svg).toContain("Analyzing usage patterns");
    expect(svg).not.toContain('attributeName="width"');
  });

  it("shows early results label for phase=early", () => {
    const result = makeResult({ phase: "early", sessionCount: 5 });
    const svg = renderAnimatedBadge(result);
    expect(svg).toContain("early results");
  });

  it("produces valid accessible SVG", () => {
    const svg = renderAnimatedBadge(makeResult());
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title");
  });

  it("escapes XML in username", () => {
    const result = makeResult({ username: "test<xss>" });
    const svg = renderAnimatedBadge(result);
    expect(svg).not.toContain("<xss>");
    expect(svg).toContain("&lt;xss&gt;");
  });

  it("includes streak and achievement count", () => {
    const result = makeResult({ streak: 42, achievementCount: 15 });
    const svg = renderAnimatedBadge(result);
    expect(svg).toContain("42d");
    expect(svg).toContain("15");
  });

  it("shows token line when tokenWindows provided", () => {
    const svg = renderAnimatedBadge(makeResult(), { tokens24h: 1500000, tokens30d: 15300000 });
    expect(svg).toContain("tokens");
    expect(svg).toContain("1.5M/24h");
    expect(svg).toContain("15.3M/30d");
  });

  it("omits token line when tokenWindows undefined", () => {
    const svg = renderAnimatedBadge(makeResult());
    expect(svg).not.toContain("tokens");
    expect(svg).not.toContain("/24h");
  });

  it("increases badge height when tokens present", () => {
    const svgWithout = renderAnimatedBadge(makeResult());
    const svgWith = renderAnimatedBadge(makeResult(), { tokens24h: 1000, tokens30d: 5000 });
    const heightWithout = parseInt(svgWithout.match(/height="(\d+)"/)?.[1] ?? "0");
    const heightWith = parseInt(svgWith.match(/height="(\d+)"/)?.[1] ?? "0");
    expect(heightWith).toBeGreaterThan(heightWithout);
  });
});
