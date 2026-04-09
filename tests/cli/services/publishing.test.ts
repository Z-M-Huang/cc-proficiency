import { describe, it, expect } from "vitest";
import { buildRecentSessionsForRemote } from "../../../src/cli/services/publishing.js";
import type { LocalStore, ProficiencyResult } from "../../../src/types.js";

function makeResult(totalHours: number): ProficiencyResult {
  return {
    username: "testuser",
    timestamp: new Date().toISOString(),
    domains: [
      { id: "cc-mastery", label: "CC Mastery", score: 80, maxPossible: 100, percentage: 80, weight: 0.2, confidence: "high", dataPoints: 10 },
      { id: "tool-mcp", label: "Tool/MCP", score: 75, maxPossible: 100, percentage: 75, weight: 0.2, confidence: "high", dataPoints: 10 },
      { id: "agentic", label: "Agentic", score: 70, maxPossible: 100, percentage: 70, weight: 0.2, confidence: "medium", dataPoints: 10 },
      { id: "prompt-craft", label: "Prompt Craft", score: 85, maxPossible: 100, percentage: 85, weight: 0.2, confidence: "high", dataPoints: 10 },
      { id: "context-mgmt", label: "Context", score: 78, maxPossible: 100, percentage: 78, weight: 0.2, confidence: "medium", dataPoints: 10 },
    ],
    features: {
      hooks: [],
      skills: [],
      mcpServers: [],
      topTools: [],
      totalToolCalls: 0,
      uniqueToolCount: 0,
      usedPlanMode: false,
      hasMemory: false,
      hasRules: false,
      hasAgents: false,
      hasSkills: false,
      totalHours,
    },
    sessionCount: 4,
    projectCount: 1,
    phase: "full",
    setupChecklist: {
      hasClaudeMd: false,
      hasHooks: false,
      hasPlugins: false,
      hasMcpServers: false,
      hasMemory: false,
      hasRules: false,
      hasAgents: false,
      hasSkills: false,
    },
  };
}

describe("buildRecentSessionsForRemote", () => {
  it("filters sessions without valid timestamps and falls back to token timestamps", () => {
    const store: LocalStore = {
      processedSessionIds: ["token-first", "snapshot-only", "invalid", "missing"],
      snapshots: [
        {
          sessionId: "token-first",
          timestamp: "invalid",
          project: "proj",
          signals: {} as never,
          scoringVersion: "1.0.0",
        },
        {
          sessionId: "snapshot-only",
          timestamp: "2026-04-01T12:00:00Z",
          project: "proj",
          signals: {} as never,
          scoringVersion: "1.0.0",
        },
      ],
      tokenLog: [
        { sessionId: "token-first", timestamp: "2026-04-02T03:00:00Z", tokens: 900 },
        { sessionId: "invalid", timestamp: "not-a-date", tokens: 500 },
      ],
    };

    const sessions = buildRecentSessionsForRemote(store, makeResult(8));

    expect(sessions).toHaveLength(2);
    expect(sessions.map((session) => session.id)).toEqual(["token-first", "snapshot-only"]);
    expect(sessions[0]).toMatchObject({
      id: "token-first",
      date: "2026-04-02",
      tokens: 900,
      endTimestamp: "2026-04-02T03:00:00Z",
    });
    expect(sessions[1]).toMatchObject({
      id: "snapshot-only",
      date: "2026-04-01",
    });
  });
});
