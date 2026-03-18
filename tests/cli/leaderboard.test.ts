import { describe, it, expect } from "vitest";
import type { LeaderboardEntry, LeaderboardCache } from "../../src/types.js";

function makeEntry(username: string, avg: number, streak: number = 0): LeaderboardEntry {
  return {
    username,
    domains: [
      { id: "cc-mastery", score: avg },
      { id: "tool-mcp", score: avg + 5 },
      { id: "agentic", score: avg - 5 },
      { id: "prompt-craft", score: avg },
      { id: "context-mgmt", score: avg + 10 },
    ],
    averageScore: avg,
    streak,
    achievementCount: 3,
    totalSessions: 50,
    totalHours: 30,
    memberSince: "2026-01-01T00:00:00Z",
  };
}

describe("LeaderboardEntry sorting", () => {
  const entries = [
    makeEntry("alice", 85, 7),
    makeEntry("bob", 92, 3),
    makeEntry("carol", 78, 14),
  ];

  it("sorts by average score descending", () => {
    const sorted = [...entries].sort((a, b) => b.averageScore - a.averageScore);
    expect(sorted[0]!.username).toBe("bob");
    expect(sorted[1]!.username).toBe("alice");
    expect(sorted[2]!.username).toBe("carol");
  });

  it("sorts by streak descending", () => {
    const sorted = [...entries].sort((a, b) => b.streak - a.streak);
    expect(sorted[0]!.username).toBe("carol");
    expect(sorted[1]!.username).toBe("alice");
  });

  it("sorts by specific domain", () => {
    const sorted = [...entries].sort((a, b) => {
      const aScore = a.domains.find((d) => d.id === "context-mgmt")?.score ?? 0;
      const bScore = b.domains.find((d) => d.id === "context-mgmt")?.score ?? 0;
      return bScore - aScore;
    });
    expect(sorted[0]!.username).toBe("bob"); // 102
    expect(sorted[1]!.username).toBe("alice"); // 95
  });
});

describe("LeaderboardCache", () => {
  it("validates cache structure", () => {
    const cache: LeaderboardCache = {
      fetchedAt: new Date().toISOString(),
      entries: [makeEntry("alice", 85)],
    };
    expect(cache.entries).toHaveLength(1);
    expect(!isNaN(Date.parse(cache.fetchedAt))).toBe(true);
  });

  it("detects stale cache (>5 min)", () => {
    const staleTime = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const freshTime = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const isStale = (fetchedAt: string) => {
      const age = Date.now() - new Date(fetchedAt).getTime();
      return age > 5 * 60 * 1000;
    };

    expect(isStale(staleTime)).toBe(true);
    expect(isStale(freshTime)).toBe(false);
  });
});
