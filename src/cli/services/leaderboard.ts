import { readRegistry, readPublicProfileFromGist } from "../../gist/registry.js";
import { loadLeaderboardCache, saveLeaderboardCache } from "../../store/local-store.js";
import type { LeaderboardEntry, LeaderboardCache } from "../../types.js";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function shouldRefreshCache(cache: LeaderboardCache): boolean {
  const age = Date.now() - new Date(cache.fetchedAt).getTime();
  return isNaN(age) || age > CACHE_TTL_MS;
}

function profileToEntry(
  username: string,
  profile: Record<string, unknown>
): LeaderboardEntry | null {
  try {
    const domains = Array.isArray(profile.domains) ? profile.domains as Array<{ id: string; score: number }> : [];
    const streak = typeof profile.streak === "object" && profile.streak !== null ? profile.streak as { current: number } : { current: 0 };
    const scores = domains.map((d) => typeof d.score === "number" ? d.score : 0);
    const avg = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

    return {
      username,
      domains,
      averageScore: avg,
      streak: typeof streak.current === "number" ? streak.current : 0,
      achievementCount: typeof profile.achievementCount === "number" ? profile.achievementCount as number : 0,
      totalSessions: typeof profile.totalSessions === "number" ? profile.totalSessions as number : 0,
      totalHours: typeof profile.totalHours === "number" ? profile.totalHours as number : 0,
      memberSince: typeof profile.memberSince === "string" ? profile.memberSince as string : "",
    };
  } catch {
    return null;
  }
}

/**
 * Fetch leaderboard from registry gist + individual public profiles.
 * Falls back to cache if offline.
 */
export function fetchLeaderboard(
  sortBy: string = "avg",
  limit: number = 20
): { entries: LeaderboardEntry[]; fromCache: boolean; skipped: number } {
  // Try cache first
  const cache = loadLeaderboardCache();
  const useCache = cache && !shouldRefreshCache(cache);

  if (useCache) {
    return {
      entries: sortEntries(cache.entries, sortBy).slice(0, limit),
      fromCache: true,
      skipped: 0,
    };
  }

  // Fetch fresh data
  const registry = readRegistry();
  if (!registry) {
    // Offline or unavailable — fall back to cache
    if (cache) {
      return {
        entries: sortEntries(cache.entries, sortBy).slice(0, limit),
        fromCache: true,
        skipped: 0,
      };
    }
    return { entries: [], fromCache: false, skipped: 0 };
  }

  const entries: LeaderboardEntry[] = [];
  let skipped = 0;

  for (const entry of registry.entries) {
    const profile = readPublicProfileFromGist(entry.publicGistId);
    if (!profile) {
      skipped++;
      continue;
    }
    const leaderboardEntry = profileToEntry(entry.username, profile as unknown as Record<string, unknown>);
    if (leaderboardEntry) {
      entries.push(leaderboardEntry);
    } else {
      skipped++;
    }
  }

  // Save to cache
  const newCache: LeaderboardCache = {
    fetchedAt: new Date().toISOString(),
    entries,
  };
  saveLeaderboardCache(newCache);

  return {
    entries: sortEntries(entries, sortBy).slice(0, limit),
    fromCache: false,
    skipped,
  };
}

function sortEntries(entries: LeaderboardEntry[], sortBy: string): LeaderboardEntry[] {
  const sorted = [...entries];

  const domainSortKeys: Record<string, string> = {
    "cc-mastery": "cc-mastery",
    "tool-mcp": "tool-mcp",
    "agentic": "agentic",
    "prompt-craft": "prompt-craft",
    "context-mgmt": "context-mgmt",
  };

  if (sortBy in domainSortKeys) {
    const domainId = domainSortKeys[sortBy]!;
    sorted.sort((a, b) => {
      const aScore = a.domains.find((d) => d.id === domainId)?.score ?? 0;
      const bScore = b.domains.find((d) => d.id === domainId)?.score ?? 0;
      return bScore - aScore;
    });
  } else if (sortBy === "hours") {
    sorted.sort((a, b) => b.totalHours - a.totalHours);
  } else if (sortBy === "streak") {
    sorted.sort((a, b) => b.streak - a.streak);
  } else if (sortBy === "sessions") {
    sorted.sort((a, b) => b.totalSessions - a.totalSessions);
  } else {
    // Default: average score
    sorted.sort((a, b) => b.averageScore - a.averageScore);
  }

  return sorted;
}
