import type { RemoteStore, PublicProfile } from "../types.js";
import { getTotalStats } from "./remote-store.js";

/**
 * Build a privacy-safe public profile from RemoteStore.
 * Excludes: recentSessions, projects, featureScores, weeklyTrends,
 * activeDates, lastPushMachine, individual achievement IDs.
 */
export function buildPublicProfile(remote: RemoteStore): PublicProfile {
  const totals = getTotalStats(remote);

  return {
    version: "1.0.0",
    username: remote.username,
    memberSince: remote.memberSince,
    domains: remote.domains.map((d) => ({
      id: d.id,
      score: d.score,
      confidence: d.confidence,
    })),
    streak: {
      current: remote.streak.current,
      longest: remote.streak.longest,
    },
    achievementCount: remote.achievements.length,
    totalSessions: totals.sessions,
    totalHours: Math.round(totals.hours * 10) / 10,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Parse a PublicProfile from JSON string. Returns null if invalid.
 */
export function parsePublicProfile(json: string): PublicProfile | null {
  try {
    const data = JSON.parse(json);
    if (data?.version !== "1.0.0") return null;
    if (typeof data.username !== "string") return null;
    if (!Array.isArray(data.domains)) return null;
    return data as PublicProfile;
  } catch {
    return null;
  }
}
