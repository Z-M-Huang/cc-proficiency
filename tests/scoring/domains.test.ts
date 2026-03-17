import { describe, it, expect } from "vitest";
import { fireRules, aggregateToBuckets, bucketsToScores, extractFeatureScores } from "../../src/scoring/rule-engine.js";
import { RULES } from "../../src/scoring/rules.js";
import type { NormalizedEvent } from "../../src/types.js";
import type { ConfigSignals } from "../../src/parsers/config-parser.js";

const emptyConfig: ConfigSignals = {
  hasGlobalClaudeMd: false, globalClaudeMdHasImports: false, projectClaudeMdCount: 0,
  hasCustomHooks: false, hookWithMatcherCount: 0, pluginCount: 0, pluginNames: [],
  hasRulesFiles: false, hasMcpServers: false, hasMemoryFiles: false,
  memoryFileCount: 0, activeMemoryFileCount: 0, effortLevel: "",
};

describe("Rule Engine", () => {
  it("fires config rules with no events", () => {
    const config = { ...emptyConfig, hasGlobalClaudeMd: true, pluginCount: 8 };
    const fires = fireRules([], config, 0);
    expect(fires.length).toBeGreaterThan(0);
    expect(fires.some((f) => f.ruleId === "ccm-claudemd-exists")).toBe(true);
    expect(fires.some((f) => f.ruleId === "ccm-plugins-diverse")).toBe(true);
  });

  it("fires behavior rules from events", () => {
    const events: NormalizedEvent[] = [
      { kind: "tool_call", sessionId: "s1", timestamp: "t1", toolName: "Grep", toolId: "1", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t2", toolName: "Read", toolId: "2", input: {} },
      { kind: "tool_call", sessionId: "s1", timestamp: "t3", toolName: "Edit", toolId: "3", input: {} },
    ];
    const fires = fireRules(events, emptyConfig, 1);
    expect(fires.some((f) => f.ruleId === "tool-investigation-chain")).toBe(true);
    expect(fires.some((f) => f.ruleId === "tool-read-before-edit")).toBe(true);
  });

  it("caps per-session occurrences", () => {
    // investigation-chain has maxPerSession: 3
    const events: NormalizedEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(
        { kind: "tool_call", sessionId: "s1", timestamp: `t${i*3}`, toolName: "Grep", toolId: `g${i}`, input: {} },
        { kind: "tool_call", sessionId: "s1", timestamp: `t${i*3+1}`, toolName: "Read", toolId: `r${i}`, input: {} },
        { kind: "tool_call", sessionId: "s1", timestamp: `t${i*3+2}`, toolName: "Edit", toolId: `e${i}`, input: {} },
      );
    }
    const fires = fireRules(events, emptyConfig, 1);
    const chainFire = fires.find((f) => f.ruleId === "tool-investigation-chain");
    expect(chainFire).toBeDefined();
    expect(chainFire!.count).toBeLessThanOrEqual(3); // capped
  });

  it("aggregates into buckets with caps", () => {
    const config = {
      ...emptyConfig, hasGlobalClaudeMd: true, globalClaudeMdHasImports: true,
      hasCustomHooks: true, hookWithMatcherCount: 5, pluginCount: 12,
      hasRulesFiles: true, hasMcpServers: true, effortLevel: "high",
    };
    const fires = fireRules([], config, 0);
    const buckets = aggregateToBuckets(fires);
    const ccBucket = buckets.get("cc-mastery")!;
    expect(ccBucket.configPoints).toBeLessThanOrEqual(25); // CONFIG_CAP
  });

  it("produces 5 domain scores", () => {
    const fires = fireRules([], emptyConfig, 0);
    const buckets = aggregateToBuckets(fires);
    const scores = bucketsToScores(buckets, "full");
    expect(scores).toHaveLength(5);
    expect(scores.map((s) => s.id)).toEqual(["cc-mastery", "tool-mcp", "agentic", "prompt-craft", "context-mgmt"]);
  });

  it("feature scores extract from rule tags", () => {
    const config = { ...emptyConfig, hasCustomHooks: true, hookWithMatcherCount: 3 };
    const events: NormalizedEvent[] = [
      { kind: "hook_progress", sessionId: "s1", timestamp: "t1", hookEvent: "PreToolUse", hookName: "PreToolUse:Edit", command: "cmd" },
      { kind: "hook_progress", sessionId: "s1", timestamp: "t2", hookEvent: "PostToolUse", hookName: "PostToolUse:Write", command: "cmd" },
      { kind: "hook_progress", sessionId: "s1", timestamp: "t3", hookEvent: "Stop", hookName: "Stop:check", command: "cmd" },
    ];
    const fires = fireRules(events, config, 1);
    const featureScores = extractFeatureScores(fires);
    expect(featureScores.get("hooks")!.score).toBeGreaterThan(0);
  });
});

describe("Rule coverage", () => {
  it("has rules for all 5 domains", () => {
    const domains = new Set(RULES.map((r) => r.domain));
    expect(domains.has("cc-mastery")).toBe(true);
    expect(domains.has("tool-mcp")).toBe(true);
    expect(domains.has("agentic")).toBe(true);
    expect(domains.has("prompt-craft")).toBe(true);
    expect(domains.has("context-mgmt")).toBe(true);
  });

  it("has 60+ rules total", () => {
    expect(RULES.length).toBeGreaterThanOrEqual(50);
  });

  it("has anti-pattern rules", () => {
    expect(RULES.some((r) => r.tier === "anti-pattern")).toBe(true);
  });

  it("has beginner, intermediate, and advanced rules per domain", () => {
    for (const domain of ["cc-mastery", "tool-mcp", "agentic", "prompt-craft", "context-mgmt"]) {
      const domainRules = RULES.filter((r) => r.domain === domain);
      expect(domainRules.some((r) => r.tier === "beginner"), `${domain} missing beginner`).toBe(true);
      expect(domainRules.some((r) => r.tier === "intermediate"), `${domain} missing intermediate`).toBe(true);
      expect(domainRules.some((r) => r.tier === "advanced"), `${domain} missing advanced`).toBe(true);
    }
  });
});
