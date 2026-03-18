import { describe, it, expect } from "vitest";
import { buildPublicProfile, parsePublicProfile } from "../../src/store/public-profile.js";
import type { RemoteStore } from "../../src/types.js";

function makeRemoteStore(overrides?: Partial<RemoteStore>): RemoteStore {
  return {
    version: "1.0.0",
    username: "testuser",
    memberSince: "2026-01-01T00:00:00Z",
    recentSessions: [
      { id: "s1", date: "2026-03-15", hours: 2.5 },
      { id: "s2", date: "2026-03-16", hours: 1.5 },
    ],
    archivedStats: { sessions: 10, hours: 30, projects: ["proj-a", "proj-b"] },
    lastPushMachine: "my-laptop",
    lastPushTimestamp: "2026-03-17T00:00:00Z",
    domains: [
      { id: "cc-mastery", score: 80, confidence: "high" },
      { id: "tool-mcp", score: 90, confidence: "medium" },
      { id: "agentic", score: 70, confidence: "low" },
      { id: "prompt-craft", score: 85, confidence: "high" },
      { id: "context-mgmt", score: 95, confidence: "high" },
    ],
    featureScores: { hooks: 80, plugins: 50 },
    streak: { current: 5, longest: 12, lastActiveDate: "2026-03-17", activeDates: ["2026-03-15", "2026-03-16", "2026-03-17"] },
    achievements: [
      { id: "first-session", unlockedAt: "2026-01-01T00:00:00Z" },
      { id: "ten-sessions", unlockedAt: "2026-02-01T00:00:00Z" },
    ],
    weeklyTrends: [{ week: "2026-03-11", domains: {}, hours: 4, sessions: 2 }],
    ...overrides,
  };
}

describe("buildPublicProfile", () => {
  it("extracts correct public fields", () => {
    const remote = makeRemoteStore();
    const profile = buildPublicProfile(remote);

    expect(profile.version).toBe("1.0.0");
    expect(profile.username).toBe("testuser");
    expect(profile.memberSince).toBe("2026-01-01T00:00:00Z");
    expect(profile.domains).toHaveLength(5);
    expect(profile.streak.current).toBe(5);
    expect(profile.streak.longest).toBe(12);
    expect(profile.achievementCount).toBe(2);
    expect(profile.totalSessions).toBe(12); // 10 archived + 2 recent
    expect(profile.totalHours).toBe(34); // 30 archived + 4 recent
  });

  it("excludes private fields", () => {
    const remote = makeRemoteStore();
    const profile = buildPublicProfile(remote);
    const json = JSON.stringify(profile);

    // Must NOT contain private data
    expect(json).not.toContain("recentSessions");
    expect(json).not.toContain("archivedStats");
    expect(json).not.toContain("featureScores");
    expect(json).not.toContain("weeklyTrends");
    expect(json).not.toContain("activeDates");
    expect(json).not.toContain("lastPushMachine");
    expect(json).not.toContain("my-laptop");
    expect(json).not.toContain("proj-a");
    expect(json).not.toContain("first-session");
  });

  it("handles empty remote store", () => {
    const remote = makeRemoteStore({
      recentSessions: [],
      archivedStats: { sessions: 0, hours: 0, projects: [] },
      achievements: [],
      domains: [],
    });
    const profile = buildPublicProfile(remote);
    expect(profile.totalSessions).toBe(0);
    expect(profile.achievementCount).toBe(0);
    expect(profile.domains).toHaveLength(0);
  });
});

describe("parsePublicProfile", () => {
  it("parses valid profile", () => {
    const remote = makeRemoteStore();
    const profile = buildPublicProfile(remote);
    const parsed = parsePublicProfile(JSON.stringify(profile));
    expect(parsed).not.toBeNull();
    expect(parsed!.username).toBe("testuser");
  });

  it("returns null for invalid version", () => {
    expect(parsePublicProfile('{"version":"2.0.0"}')).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parsePublicProfile("not json")).toBeNull();
  });

  it("returns null for missing username", () => {
    expect(parsePublicProfile('{"version":"1.0.0","domains":[]}')).toBeNull();
  });
});
