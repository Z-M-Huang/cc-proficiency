import { hostname } from "node:os";
import type { RemoteStore, ProficiencyResult, StreakData, WeeklyTrend, DomainId } from "../types.js";

/**
 * Create an empty RemoteStore.
 */
export function emptyRemoteStore(username: string): RemoteStore {
  return {
    version: "1.0.0",
    username,
    memberSince: new Date().toISOString(),
    processedSessionIds: [],
    sessionHours: {},
    sessionProjects: {},
    lastPushMachine: hostname(),
    lastPushTimestamp: new Date().toISOString(),
    domains: [],
    featureScores: {},
    streak: { current: 0, longest: 0, lastActiveDate: "", activeDates: [] },
    achievements: [],
    weeklyTrends: [],
  };
}

/**
 * Parse a RemoteStore from JSON string. Returns null if invalid.
 */
export function parseRemoteStore(json: string): RemoteStore | null {
  try {
    const data = JSON.parse(json);
    if (data?.version !== "1.0.0") return null;
    return data as RemoteStore;
  } catch {
    return null;
  }
}

/**
 * Merge local data into a remote store (all operations are idempotent).
 */
export function mergeIntoRemote(
  remote: RemoteStore,
  localSessionIds: string[],
  localSessionHours: Record<string, number>,
  localSessionProjects: Record<string, string>,
  localActiveDates: string[],
  result: ProficiencyResult
): RemoteStore {
  // Session IDs: set union
  const allIds = new Set([...remote.processedSessionIds, ...localSessionIds]);

  // Session hours: map merge
  const allHours = { ...remote.sessionHours, ...localSessionHours };

  // Session projects: map merge
  const allProjects = { ...remote.sessionProjects, ...localSessionProjects };

  // Active dates: set union, keep last 90 days
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const allDates = [...new Set([...remote.streak.activeDates, ...localActiveDates])]
    .filter((d) => d >= cutoffStr)
    .sort();

  // Recalculate streak from merged dates
  const streak = calculateStreak(allDates, remote.streak.longest);

  // Scores: latest push wins
  const domains = result.domains.map((d) => ({
    id: d.id,
    score: d.score,
    confidence: d.confidence,
  }));

  // Feature scores: latest push wins
  const featureScores = result.features.featureScores ?? {};

  // Member since: keep earliest
  const memberSince = remote.memberSince && remote.memberSince < result.timestamp
    ? remote.memberSince
    : result.timestamp;

  return {
    version: "1.0.0",
    username: remote.username || result.username,
    memberSince,
    processedSessionIds: [...allIds],
    sessionHours: allHours,
    sessionProjects: allProjects,
    lastPushMachine: hostname(),
    lastPushTimestamp: new Date().toISOString(),
    domains,
    featureScores,
    streak,
    achievements: remote.achievements, // achievements merged separately
    weeklyTrends: remote.weeklyTrends, // trends merged separately
  };
}

/**
 * Calculate streak from sorted active dates.
 */
export function calculateStreak(
  sortedDates: string[],
  previousLongest: number = 0
): StreakData {
  if (sortedDates.length === 0) {
    return { current: 0, longest: previousLongest, lastActiveDate: "", activeDates: sortedDates };
  }

  // Count consecutive days backward from most recent
  let current = 1;
  for (let i = sortedDates.length - 1; i > 0; i--) {
    const d1 = new Date(sortedDates[i]!);
    const d2 = new Date(sortedDates[i - 1]!);
    const diffDays = (d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000);
    if (diffDays === 1) {
      current++;
    } else {
      break;
    }
  }

  const longest = Math.max(previousLongest, current);
  const lastActiveDate = sortedDates[sortedDates.length - 1]!;

  return { current, longest, lastActiveDate, activeDates: sortedDates };
}

/**
 * Merge weekly trends (take max score per domain per week, not sum).
 */
export function mergeWeeklyTrends(
  remote: WeeklyTrend[],
  local: WeeklyTrend[]
): WeeklyTrend[] {
  const byWeek = new Map<string, WeeklyTrend>();

  for (const t of remote) byWeek.set(t.week, t);

  for (const t of local) {
    const existing = byWeek.get(t.week);
    if (!existing) {
      byWeek.set(t.week, t);
    } else {
      // Merge: max score per domain, sum hours/sessions
      const mergedDomains: Record<string, number> = { ...existing.domains };
      for (const [id, score] of Object.entries(t.domains)) {
        mergedDomains[id] = Math.max(mergedDomains[id] ?? 0, score);
      }
      byWeek.set(t.week, {
        week: t.week,
        domains: mergedDomains,
        hours: Math.max(existing.hours, t.hours),
        sessions: Math.max(existing.sessions, t.sessions),
      });
    }
  }

  // Keep last 12 weeks
  return [...byWeek.values()]
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-12);
}

/**
 * Get the UTC Monday date string for a given timestamp.
 */
export function getWeekMonday(timestamp: string): string {
  const d = new Date(timestamp);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Get UTC date string (YYYY-MM-DD) from a timestamp.
 */
export function getUTCDate(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}
