import { describe, it, expect } from "vitest";
import { computeFeatureDepthScores, type FeatureDepthInput } from "../../src/scoring/feature-scores.js";
import type { ConfigSignals } from "../../src/parsers/config-parser.js";

const emptyConfig: ConfigSignals = {
  hasGlobalClaudeMd: false, globalClaudeMdHasImports: false, projectClaudeMdCount: 0,
  hasCustomHooks: false, hookWithMatcherCount: 0, pluginCount: 0, pluginNames: [],
  hasRulesFiles: false, rulesFileCount: 0, hasMcpServers: false, hasMemoryFiles: false,
  memoryFileCount: 0, activeMemoryFileCount: 0, effortLevel: "",
  hasCustomAgents: false, hasCustomSkills: false,
};

function makeInput(overrides: Partial<FeatureDepthInput> = {}): FeatureDepthInput {
  return {
    hooks: [],
    skills: [],
    mcpServers: [],
    mcpCalls: 0,
    agentCalls: 0,
    agentTypes: 0,
    pluginCount: 0,
    pluginsUsed: 0,
    planModePrompts: 0,
    config: emptyConfig,
    ...overrides,
  };
}

describe("computeFeatureDepthScores", () => {
  it("returns 0 for all features with zero input (except binary)", () => {
    const scores = computeFeatureDepthScores(makeInput());
    expect(scores.hooks).toBe(0);
    expect(scores.plugins).toBe(0);
    expect(scores.skills).toBe(0);
    expect(scores.mcp).toBe(0);
    expect(scores.agents).toBe(0);
    expect(scores.plan).toBe(0);
    expect(scores.memory).toBe(0);
    expect(scores.rules).toBe(0);
  });

  it("returns all 8 keys", () => {
    const scores = computeFeatureDepthScores(makeInput());
    const keys = Object.keys(scores).sort();
    expect(keys).toEqual(["agents", "hooks", "mcp", "memory", "plan", "plugins", "rules", "skills"]);
  });

  it("returns integers only", () => {
    const scores = computeFeatureDepthScores(makeInput({
      hooks: [{ name: "test", count: 7 }],
      skills: [{ name: "commit", count: 3 }],
      mcpServers: ["github"],
      mcpCalls: 5,
      agentCalls: 2,
      agentTypes: 1,
    }));
    for (const [, v] of Object.entries(scores)) {
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  describe("config-only scores stay below 30", () => {
    it("hooks config-only", () => {
      const scores = computeFeatureDepthScores(makeInput({
        config: { ...emptyConfig, hasCustomHooks: true, hookWithMatcherCount: 3 },
      }));
      expect(scores.hooks).toBe(30);
    });

    it("skills config-only", () => {
      const scores = computeFeatureDepthScores(makeInput({
        config: { ...emptyConfig, hasCustomSkills: true },
      }));
      expect(scores.skills).toBe(15);
    });

    it("mcp config-only", () => {
      const scores = computeFeatureDepthScores(makeInput({
        config: { ...emptyConfig, hasMcpServers: true },
      }));
      expect(scores.mcp).toBe(15);
    });

    it("agents config-only", () => {
      const scores = computeFeatureDepthScores(makeInput({
        config: { ...emptyConfig, hasCustomAgents: true },
      }));
      expect(scores.agents).toBe(15);
    });

    it("plugins scales with install count", () => {
      const few = computeFeatureDepthScores(makeInput({ pluginCount: 2 }));
      const many = computeFeatureDepthScores(makeInput({ pluginCount: 10 }));
      expect(few.plugins).toBeGreaterThan(0);
      expect(few.plugins).toBeLessThan(30);
      expect(many.plugins).toBeGreaterThan(70);
    });
  });

  describe("light usage produces low scores", () => {
    it("1 skill, 1 invocation", () => {
      const scores = computeFeatureDepthScores(makeInput({
        skills: [{ name: "commit", count: 1 }],
      }));
      expect(scores.skills).toBeGreaterThan(0);
      expect(scores.skills).toBeLessThan(40);
    });

    it("1 hook, 1 fire", () => {
      const scores = computeFeatureDepthScores(makeInput({
        hooks: [{ name: "lint", count: 1 }],
      }));
      expect(scores.hooks).toBeGreaterThan(0);
      expect(scores.hooks).toBeLessThan(40);
    });

    it("1 MCP server, 1 call", () => {
      const scores = computeFeatureDepthScores(makeInput({
        mcpServers: ["github"],
        mcpCalls: 1,
      }));
      expect(scores.mcp).toBeGreaterThan(0);
      expect(scores.mcp).toBeLessThan(40);
    });
  });

  describe("heavy usage produces high scores", () => {
    it("8 skills, 50 invocations", () => {
      const skills = Array.from({ length: 8 }, (_, i) => ({ name: `skill-${i}`, count: 6 }));
      const scores = computeFeatureDepthScores(makeInput({ skills }));
      expect(scores.skills).toBeGreaterThan(70);
    });

    it("6 hooks, 100 fires, with matchers", () => {
      const hooks = Array.from({ length: 6 }, (_, i) => ({ name: `hook-${i}`, count: 17 }));
      const scores = computeFeatureDepthScores(makeInput({
        hooks,
        config: { ...emptyConfig, hasCustomHooks: true, hookWithMatcherCount: 3 },
      }));
      expect(scores.hooks).toBeGreaterThan(80);
    });

    it("3 MCP servers, 50 calls", () => {
      const scores = computeFeatureDepthScores(makeInput({
        mcpServers: ["github", "context7", "slack"],
        mcpCalls: 50,
        config: { ...emptyConfig, hasMcpServers: true },
      }));
      expect(scores.mcp).toBeGreaterThan(70);
    });

    it("3 agent types, 20 calls, custom agents", () => {
      const scores = computeFeatureDepthScores(makeInput({
        agentCalls: 20,
        agentTypes: 3,
        config: { ...emptyConfig, hasCustomAgents: true },
      }));
      expect(scores.agents).toBeGreaterThan(60);
    });
  });

  describe("log scaling provides diminishing returns", () => {
    it("100 skill calls scores higher than 10, but not 10x higher", () => {
      const low = computeFeatureDepthScores(makeInput({
        skills: [{ name: "a", count: 10 }],
      }));
      const high = computeFeatureDepthScores(makeInput({
        skills: [{ name: "a", count: 100 }],
      }));
      expect(high.skills).toBeGreaterThan(low.skills);
      expect(high.skills).toBeLessThan(low.skills * 4);
    });
  });

  describe("graduated plan mode", () => {
    it("0 prompts = 0", () => {
      expect(computeFeatureDepthScores(makeInput({ planModePrompts: 0 })).plan).toBe(0);
    });

    it("1 prompt = low score", () => {
      const score = computeFeatureDepthScores(makeInput({ planModePrompts: 1 })).plan;
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(50);
    });

    it("10 prompts = high score", () => {
      expect(computeFeatureDepthScores(makeInput({ planModePrompts: 10 })).plan).toBeGreaterThan(70);
    });

    it("more prompts = higher score with diminishing returns", () => {
      const s5 = computeFeatureDepthScores(makeInput({ planModePrompts: 5 })).plan;
      const s20 = computeFeatureDepthScores(makeInput({ planModePrompts: 20 })).plan;
      expect(s20).toBeGreaterThan(s5);
      expect(s20).toBeLessThan(s5 * 3);
    });
  });

  describe("graduated rules", () => {
    it("0 files = 0", () => {
      expect(computeFeatureDepthScores(makeInput()).rules).toBe(0);
    });

    it("1 file = partial score", () => {
      const score = computeFeatureDepthScores(makeInput({
        config: { ...emptyConfig, hasRulesFiles: true, rulesFileCount: 1 },
      })).rules;
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(30);
    });

    it("3 files = ~50%", () => {
      const score = computeFeatureDepthScores(makeInput({
        config: { ...emptyConfig, hasRulesFiles: true, rulesFileCount: 3 },
      })).rules;
      expect(score).toBe(50);
    });

    it("6+ files = 100", () => {
      expect(computeFeatureDepthScores(makeInput({
        config: { ...emptyConfig, hasRulesFiles: true, rulesFileCount: 6 },
      })).rules).toBe(100);
    });
  });

  it("memory rewards file count and active maintenance", () => {
    const configOnly = computeFeatureDepthScores(makeInput({
      config: { ...emptyConfig, hasMemoryFiles: true, memoryFileCount: 1, activeMemoryFileCount: 0 },
    }));
    const rich = computeFeatureDepthScores(makeInput({
      config: { ...emptyConfig, hasMemoryFiles: true, memoryFileCount: 5, activeMemoryFileCount: 3 },
    }));
    expect(rich.memory).toBeGreaterThan(configOnly.memory);
    expect(configOnly.memory).toBeLessThanOrEqual(30);
    expect(rich.memory).toBeGreaterThan(80);
  });
});
