import { describe, it, expect } from "vitest";
import { renderAIAnimatedBadge } from "../../src/renderer/ai-animated-svg.js";
import type { AIGradingResult, AIGradedDomain, AIPhase, ProficiencyResult } from "../../src/types.js";

function makeDomain(overrides: Partial<AIGradedDomain> = {}): AIGradedDomain {
  return {
    id: "goal-achievement",
    criteria: [
      { question: "Q1", score: 4, evidence: "good" },
      { question: "Q2", score: 3, evidence: "ok" },
    ],
    total: 62,
    level: "proficient",
    summary: "Strong goal clarity",
    ...overrides,
  };
}

function makeResult(overrides: Partial<AIGradingResult> = {}): AIGradingResult {
  return {
    domains: [
      makeDomain({ id: "goal-achievement", total: 72, level: "expert" }),
      makeDomain({ id: "collaboration-quality", total: 55, level: "proficient" }),
      makeDomain({ id: "workflow-mastery", total: 80, level: "expert" }),
      makeDomain({ id: "growth-learning", total: 40, level: "proficient" }),
      makeDomain({ id: "verification-quality", total: 65, level: "proficient" }),
    ],
    overall: "User demonstrates strong goal-setting and workflow mastery with room for growth.",
    model: "sonnet",
    gradedAt: "2026-03-29T12:00:00Z",
    rubricVersion: "1.0",
    ...overrides,
  };
}

// Minimal ProficiencyResult for shared header/footer
const MOCK_PROFICIENCY = {
  username: "testuser",
  timestamp: "2026-03-29T12:00:00Z",
  domains: [],
  features: { totalHours: 120, topTools: [], uniqueToolCount: 0, hooks: [], skills: [], mcpServers: [], usedPlanMode: false, hasMemory: false, hasRules: false, hasAgents: false, hasSkills: false },
  sessionCount: 50,
  projectCount: 5,
  phase: "full",
  setupChecklist: [],
  streak: 7,
  achievementCount: 3,
} as unknown as ProficiencyResult;

function render(result: AIGradingResult, phase: AIPhase): string {
  return renderAIAnimatedBadge(result, phase, MOCK_PROFICIENCY);
}

describe("renderAIAnimatedBadge", () => {
  it("contains 'AI Graded' indicator text", () => {
    expect(render(makeResult(), "full")).toContain("AI Graded");
  });

  it("contains shared header with title and username", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("Claude Code Proficiency");
    expect(svg).toContain("@testuser");
  });

  it("contains AI Graded pill with accent color", () => {
    expect(render(makeResult(), "full")).toContain("#a371f7");
  });

  it("renders 5 AI domain bars", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("Goal Achievement");
    expect(svg).toContain("Collaboration");
    expect(svg).toContain("Workflow");
    expect(svg).toContain("Growth");
    expect(svg).toContain("Verification");
  });

  it("contains SMIL animate elements for domain bars", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("<animate");
    expect(svg).toContain('attributeName="width"');
    expect(svg).toContain('from="0"');
    expect(svg).toContain('fill="freeze"');
  });

  it("uses eased spline animation for bars", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain('calcMode="spline"');
    expect(svg).toContain("keySplines=");
  });

  it("staggers domain bar animations", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain('begin="0.3s"');
    expect(svg).toContain('begin="0.5s"');
    expect(svg).toContain('begin="0.7s"');
  });

  it("fades in score percentages after bars fill", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain('attributeName="opacity"');
    expect(svg).toContain('from="0" to="1"');
  });

  it("shows level badges (N/P/E) per domain", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain(">E<");
    expect(svg).toContain(">P<");
  });

  it("shows domain percentages", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("72%");
    expect(svg).toContain("55%");
    expect(svg).toContain("80%");
  });

  it("uses distinct AI domain color palette", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("#f78166");
    expect(svg).toContain("#79c0ff");
    expect(svg).toContain("#7ee787");
  });

  it("renders insufficient data badge for phase=insufficient", () => {
    const svg = render(makeResult(), "insufficient");
    expect(svg).toContain("Insufficient Data");
    expect(svg).toContain("AI Graded");
    expect(svg).not.toContain('attributeName="width"');
  });

  it("shows early assessment note for phase=early", () => {
    const svg = render(makeResult(), "early");
    expect(svg).toContain("Early Assessment");
    expect(svg).toContain('attributeName="width"');
  });

  it("does not show early assessment note for phase=full", () => {
    expect(render(makeResult(), "full")).not.toContain("Early Assessment");
  });

  it("contains i18n switch elements", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("<switch>");
    expect(svg).toContain("</switch>");
    expect(svg).toContain("systemLanguage=");
  });

  it("produces valid accessible SVG", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toMatch(/^<svg/);
    expect(svg).toMatch(/<\/svg>$/);
    expect(svg).toContain('role="img"');
    expect(svg).toContain("<title");
    expect(svg).toContain("<desc");
  });

  it("includes shared footer with session stats", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("50");  // sessionCount
    expect(svg).toContain("5");   // projectCount
  });

  it("includes model and date in footer", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("2026-03-29");
    expect(svg).toContain("sonnet");
  });

  it("includes github link in footer", () => {
    const svg = render(makeResult(), "full");
    expect(svg).toContain("github.com/Z-M-Huang/cc-proficiency");
  });

  it("escapes XML in username", () => {
    const prof = { ...MOCK_PROFICIENCY, username: "user<script>" } as unknown as ProficiencyResult;
    const svg = renderAIAnimatedBadge(makeResult(), "full", prof);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("renders novice level correctly", () => {
    const result = makeResult({
      domains: [
        makeDomain({ id: "goal-achievement", total: 20, level: "novice" }),
        makeDomain({ id: "collaboration-quality", total: 15, level: "novice" }),
        makeDomain({ id: "workflow-mastery", total: 10, level: "novice" }),
        makeDomain({ id: "growth-learning", total: 25, level: "novice" }),
        makeDomain({ id: "verification-quality", total: 30, level: "novice" }),
      ],
    });
    const svg = render(result, "full");
    expect(svg).toContain(">N<");
    expect(svg).not.toContain(">E<");
  });

  it("has correct width of 495", () => {
    expect(render(makeResult(), "full")).toContain('width="495"');
  });

  it("insufficient badge also shows shared header", () => {
    const svg = render(makeResult(), "insufficient");
    expect(svg).toContain("Claude Code Proficiency");
    expect(svg).toContain("@testuser");
  });
});
