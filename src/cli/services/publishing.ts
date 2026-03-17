import { renderBadge } from "../../renderer/svg.js";
import { loadStore, loadConfig, saveBadge, getBadgePath } from "../../store/local-store.js";
import { isGhAuthenticated, getGistRawUrl, readGistFile, pushGistFiles } from "../../gist/uploader.js";
import { emptyRemoteStore, parseRemoteStore, mergeIntoRemote, getTotalStats, getUTCDate, getWeekMonday, mergeWeeklyTrends } from "../../store/remote-store.js";
import { checkAchievements, getAchievementDef } from "../../store/achievements.js";
import { getConfigLocale } from "../utils/locale.js";
import type { ProficiencyResult, LocalStore, WeeklyTrend } from "../../types.js";

interface MergeAndPushResult {
  success: boolean;
  error?: string;
}

/**
 * Read remote store, merge local data, check achievements, re-render badge,
 * and push SVG + JSON atomically. Used by both cmdPush and cmdProcess.
 */
export function mergeAndPush(
  store: LocalStore,
  result: ProficiencyResult,
  gistId: string,
  username: string,
  verbose: boolean = false
): MergeAndPushResult {
  const remoteJson = readGistFile(gistId, "cc-proficiency.json");
  let remote = remoteJson ? parseRemoteStore(remoteJson) : null;
  if (!remote) remote = emptyRemoteStore(username);

  const avgHours = result.features.totalHours / Math.max(store.processedSessionIds.length, 1);
  const localSessions = store.processedSessionIds.map((id) => {
    const snap = store.snapshots.find((s) => s.sessionId === id);
    return {
      id,
      date: snap ? getUTCDate(snap.timestamp) : new Date().toISOString().slice(0, 10),
      hours: avgHours,
    };
  });

  const merged = mergeIntoRemote(remote, localSessions, result);

  const totals = getTotalStats(merged);
  const ctx = {
    totalSessions: totals.sessions,
    totalHours: totals.hours,
    totalProjects: totals.projects,
    domains: merged.domains,
    streak: merged.streak,
    features: result.features,
    activeDates: merged.streak.activeDates,
  };
  const newAchievements = checkAchievements(ctx, merged.achievements.map((a) => a.id));
  for (const id of newAchievements) {
    merged.achievements.push({ id, unlockedAt: new Date().toISOString() });
    const def = getAchievementDef(id);
    if (def && verbose) console.log(`  \uD83C\uDFC6 Achievement unlocked: ${def.icon} ${def.name}`);
  }

  const thisWeek = getWeekMonday(new Date().toISOString());
  const localTrend: WeeklyTrend = {
    week: thisWeek,
    domains: Object.fromEntries(result.domains.map((d) => [d.id, d.score])),
    hours: result.features.totalHours,
    sessions: result.sessionCount,
  };
  merged.weeklyTrends = mergeWeeklyTrends(merged.weeklyTrends, [localTrend]);

  result.streak = merged.streak.current;
  result.achievementCount = merged.achievements.length;
  const finalSvg = renderBadge(result, getConfigLocale());
  saveBadge(finalSvg);

  const pushResult = pushGistFiles(gistId, {
    "cc-proficiency.svg": finalSvg,
    "cc-proficiency.json": JSON.stringify(merged, null, 2),
  });

  if (pushResult.success && verbose) {
    const rawUrl = getGistRawUrl(username, gistId);
    console.log("\u2713 Badge + data pushed to Gist");
    console.log(`  ${rawUrl}`);
    console.log(`  ${totals.sessions} sessions \u00B7 ${totals.hours.toFixed(1)}h \u00B7 ${merged.achievements.length} achievements \u00B7 \uD83D\uDD25 ${merged.streak.current}d streak`);
  }

  return pushResult.success
    ? { success: true }
    : { success: false, error: pushResult.error };
}

export function pushToGist(): void {
  const config = loadConfig();
  const store = loadStore();

  if (!store.lastResult) {
    console.log("No analysis data. Run 'cc-proficiency analyze' first.");
    return;
  }

  const svg = renderBadge(store.lastResult, getConfigLocale());
  saveBadge(svg);

  if (!isGhAuthenticated() || !config.gistId) {
    if (!isGhAuthenticated()) {
      console.log("\u26A0 GitHub CLI not authenticated.");
      console.log("To enable: gh auth login && cc-proficiency init");
    }
    if (!config.gistId) {
      console.log("No Gist configured. Run 'cc-proficiency init' first.");
    }
    console.log("Badge saved locally to: " + getBadgePath());
    return;
  }

  const result = mergeAndPush(
    store,
    store.lastResult,
    config.gistId,
    config.username ?? "unknown",
    true
  );

  if (!result.success) {
    console.log(`\u2717 Push failed: ${result.error}`);
  }
}
