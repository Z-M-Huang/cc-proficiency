import { hostname } from "node:os";
import type { RemoteStore, ProficiencyResult, StreakData, WeeklyTrend, TokenWindows } from "../types.js";
import { computeTokenWindows } from "./local-store.js";

const RETENTION_DAYS = 90;

/**
 * Create an empty RemoteStore.
 */
export function emptyRemoteStore(username: string): RemoteStore {
  return {
    version: "1.0.0",
    username,
    memberSince: new Date().toISOString(),
    recentSessions: [],
    archivedStats: { sessions: 0, hours: 0, projects: [] },
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
    // Handle migration from old format (processedSessionIds)
    if (data.processedSessionIds && !data.recentSessions) {
      data.recentSessions = [];
      data.archivedStats = {
        sessions: data.processedSessionIds.length,
        hours: Object.values(data.sessionHours ?? {}).reduce((s: number, h: unknown) => s + Number(h), 0),
        projects: [...new Set(Object.values(data.sessionProjects ?? {}) as string[])],
      };
    }
    return data as RemoteStore;
  } catch {
    return null;
  }
}

/**
 * Merge local sessions into remote store with rolling window.
 */
export function mergeIntoRemote(
  remote: RemoteStore,
  localSessions: Array<{ id: string; date: string; hours: number; tokens?: number; endTimestamp?: string }>,
  result: ProficiencyResult
): RemoteStore {
  // Merge recent sessions (upsert enrichment fields for existing, append new)
  const existingById = new Map(remote.recentSessions.map((s) => [s.id, s]));
  for (const local of localSessions) {
    const existing = existingById.get(local.id);
    if (existing) {
      // Always update token data from local (handles reparsed/corrected values)
      if (local.tokens != null) existing.tokens = local.tokens;
      if (local.endTimestamp) existing.endTimestamp = local.endTimestamp;
    } else {
      remote.recentSessions.push(local);
    }
  }
  const allRecent = remote.recentSessions;

  // Roll old sessions into archive (keep only last 90 days in recent)
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - RETENTION_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const stillRecent = allRecent.filter((s) => s.date >= cutoffStr);
  const rolledOff = allRecent.filter((s) => s.date < cutoffStr);

  // Update archived stats with rolled-off sessions
  const archivedStats = {
    sessions: remote.archivedStats.sessions + rolledOff.length,
    hours: remote.archivedStats.hours + rolledOff.reduce((s, r) => s + r.hours, 0),
    projects: remote.archivedStats.projects,
  };

  // Active dates for streak (from recent sessions)
  const allDates = [...new Set(stillRecent.map((s) => s.date))].sort();
  const streak = calculateStreak(allDates, remote.streak.longest);

  // Scores: latest push wins
  const domains = result.domains.map((d) => ({
    id: d.id,
    score: d.score,
    confidence: d.confidence,
  }));

  // Member since: keep earliest
  const memberSince = remote.memberSince && remote.memberSince < result.timestamp
    ? remote.memberSince
    : result.timestamp;

  return {
    version: "1.0.0",
    username: remote.username || result.username,
    memberSince,
    recentSessions: stillRecent,
    archivedStats,
    lastPushMachine: hostname(),
    lastPushTimestamp: new Date().toISOString(),
    domains,
    featureScores: result.features.featureScores ?? {},
    streak,
    achievements: remote.achievements, // merged separately
    weeklyTrends: remote.weeklyTrends, // merged separately
  };
}

/**
 * Get total stats from remote store (recent + archived).
 */
export function getTotalStats(remote: RemoteStore): { sessions: number; hours: number; projects: number } {
  const recentHours = remote.recentSessions.reduce((s, r) => s + r.hours, 0);

  return {
    sessions: remote.archivedStats.sessions + remote.recentSessions.length,
    hours: remote.archivedStats.hours + recentHours,
    projects: remote.archivedStats.projects.length,
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

  let current = 1;
  for (let i = sortedDates.length - 1; i > 0; i--) {
    const d1 = new Date(sortedDates[i]!);
    const d2 = new Date(sortedDates[i - 1]!);
    const diffDays = Math.round((d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 1) {
      current++;
    } else {
      break;
    }
  }

  return {
    current,
    longest: Math.max(previousLongest, current),
    lastActiveDate: sortedDates[sortedDates.length - 1]!,
    activeDates: sortedDates,
  };
}

/**
 * Merge weekly trends (take max score per domain per week).
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
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Get UTC date string (YYYY-MM-DD) from a timestamp.
 */
export function getUTCDate(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Compute token windows from merged remote recentSessions.
 * Uses endTimestamp for accuracy, falls back to date + "T23:59:59Z".
 */
export function computeTokenWindowsFromRemote(
  recentSessions: RemoteStore["recentSessions"]
): TokenWindows {
  const tokenLog = recentSessions
    .filter((s) => s.tokens != null && s.tokens > 0)
    .map((s) => ({
      sessionId: s.id,
      timestamp: s.endTimestamp ?? s.date + "T23:59:59Z",
      tokens: s.tokens!,
    }));
  return computeTokenWindows(tokenLog);
}
