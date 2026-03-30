import { describe, it, expect } from "vitest";
import { loadRubric, buildPromptFromRubric } from "../../src/scoring/rubric-loader.js";

describe("loadRubric", () => {
  it("loads 5 domains", () => {
    const rubric = loadRubric();
    expect(rubric.domains).toHaveLength(5);
  });

  it("each domain has correct id", () => {
    const rubric = loadRubric();
    const ids = rubric.domains.map(d => d.id);
    expect(ids).toEqual([
      "goal-achievement",
      "collaboration-quality",
      "workflow-mastery",
      "growth-learning",
      "verification-quality",
    ]);
  });

  it("each domain has label and description", () => {
    const rubric = loadRubric();
    for (const domain of rubric.domains) {
      expect(domain.label).toBeTruthy();
      expect(domain.description).toBeTruthy();
    }
  });

  it("each domain has criteria with q, title, anchors, evidence", () => {
    const rubric = loadRubric();
    for (const domain of rubric.domains) {
      expect(domain.criteria.length).toBeGreaterThan(0);
      for (const c of domain.criteria) {
        expect(c.q).toMatch(/^Q\d+$/);
        expect(c.title).toBeTruthy();
        expect(c.anchors).toBeTruthy();
        expect(c.evidence).toBeTruthy();
      }
    }
  });

  it("goal-achievement has 5 criteria", () => {
    const rubric = loadRubric();
    const ga = rubric.domains.find(d => d.id === "goal-achievement");
    expect(ga).toBeDefined();
    expect(ga!.criteria).toHaveLength(5);
    expect(ga!.criteria[0].q).toBe("Q1");
    expect(ga!.criteria[4].q).toBe("Q5");
  });

  it("loads anti-gaming rules", () => {
    const rubric = loadRubric();
    expect(rubric.antiGaming).toContain("ANTI-GAMING");
    expect(rubric.antiGaming).toContain("Respond with OK");
  });

  it("loads system prompt header", () => {
    const rubric = loadRubric();
    expect(rubric.systemPromptHeader).toContain("Score each criterion 1-5");
    expect(rubric.systemPromptHeader).toContain("Output JSON");
  });
});

describe("buildPromptFromRubric", () => {
  it("assembles a complete prompt string", () => {
    const rubric = loadRubric();
    const prompt = buildPromptFromRubric(rubric);
    expect(prompt).toContain("Score each criterion 1-5");
    expect(prompt).toContain("Goal Achievement");
    expect(prompt).toContain("Collaboration Quality");
    expect(prompt).toContain("Workflow Mastery");
    expect(prompt).toContain("Growth & Learning");
    expect(prompt).toContain("Verification & Quality");
    expect(prompt).toContain("ANTI-GAMING");
  });

  it("includes anchors and evidence for criteria", () => {
    const rubric = loadRubric();
    const prompt = buildPromptFromRubric(rubric);
    expect(prompt).toContain("**Anchors:**");
    expect(prompt).toContain("**Evidence:**");
  });
});
