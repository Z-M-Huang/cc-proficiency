import { renderBadge } from "../../renderer/svg.js";
import { renderAnimatedBadge } from "../../renderer/animated-svg.js";
import { loadStore, loadConfig, saveBadge, saveAnimatedBadge, getBadgePath, logError, computeTokenWindows } from "../../store/local-store.js";
import { isGhAuthenticated, getGistRawUrl, readGistFile, pushGistFiles } from "../../gist/uploader.js";
import { emptyRemoteStore, parseRemoteStore, mergeIntoRemote, getTotalStats, getUTCDate, getWeekMonday, mergeWeeklyTrends, computeTokenWindowsFromRemote } from "../../store/remote-store.js";
import { checkAchievements, getAchievementDef } from "../../store/achievements.js";
import { buildPublicProfile } from "../../store/public-profile.js";
import { parseClaudeConfig } from "../../parsers/config-parser.js";
import { buildSnapshotPayload, parseSnapshotsFile } from "../../store/config-sync.js";
import { t } from "../../i18n/index.js";
import type { ProficiencyResult, LocalStore, RemoteStore, WeeklyTrend } from "../../types.js";

export interface MergeAndPushResult {
  success: boolean;
  error?: string;
  merged?: RemoteStore;
  totals?: { sessions: number; hours: number; projects: number };
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
  verbose: boolean = false,
  configSnapshotJson?: string | null
): MergeAndPushResult {
  const remoteJson = readGistFile(gistId, "cc-proficiency.json");
  let remote = remoteJson ? parseRemoteStore(remoteJson) : null;
  if (!remote) remote = emptyRemoteStore(username);

  const avgHours = result.features.totalHours / Math.max(store.processedSessionIds.length, 1);
  const tokenMap = new Map((store.tokenLog ?? []).map((t) => [t.sessionId, t]));
  const localSessions = store.processedSessionIds.map((id) => {
    const snap = store.snapshots.find((s) => s.sessionId === id);
    const tokenEntry = tokenMap.get(id);
    return {
      id,
      date: snap ? getUTCDate(snap.timestamp) : new Date().toISOString().slice(0, 10),
      hours: avgHours,
      tokens: tokenEntry?.tokens,
      endTimestamp: tokenEntry?.timestamp,
    };
  });

  const merged = mergeIntoRemote(remote, localSessions, result);

  const totals = getTotalStats(merged);
  const cfg = loadConfig();
  const ctx = {
    totalSessions: totals.sessions,
    totalHours: totals.hours,
    totalProjects: totals.projects,
    domains: merged.domains,
    streak: merged.streak,
    features: result.features,
    activeDates: merged.streak.activeDates,
    leaderboard: cfg.leaderboard ?? false,
  };
  const newAchievements = checkAchievements(ctx, merged.achievements.map((a) => a.id));
  for (const id of newAchievements) {
    merged.achievements.push({ id, unlockedAt: new Date().toISOString() });
    const def = getAchievementDef(id);
    if (def && verbose) console.log(t().services.publishing.achievementUnlocked(def.icon, t().achievements[id]?.name ?? id));
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
  const tokenWindows = computeTokenWindowsFromRemote(merged.recentSessions);
  const finalSvg = renderBadge(result, tokenWindows);
  const animatedSvg = renderAnimatedBadge(result, tokenWindows);
  saveBadge(finalSvg);
  saveAnimatedBadge(animatedSvg);

  const files: Record<string, string> = {
    "cc-proficiency.svg": finalSvg,
    "cc-proficiency-animated.svg": animatedSvg,
    "cc-proficiency.json": JSON.stringify(merged, null, 2),
  };
  if (configSnapshotJson) {
    files["config-snapshots.json"] = configSnapshotJson;
  }
  const pushResult = pushGistFiles(gistId, files);

  if (!pushResult.success) {
    return { success: false, error: pushResult.error };
  }

  if (verbose) {
    const rawUrl = getGistRawUrl(username, gistId);
    const animatedUrl = getGistRawUrl(username, gistId, "cc-proficiency-animated.svg");
    console.log(t().services.publishing.pushedToGist);
    console.log(t().services.publishing.staticUrl(rawUrl));
    console.log(t().services.publishing.animatedUrl(animatedUrl));
    console.log(t().services.publishing.pushSummary(totals.sessions, totals.hours.toFixed(1), merged.achievements.length, merged.streak.current));
  }

  // Auto-update public profile if leaderboard is enabled
  if (cfg.leaderboard && cfg.publicGistId) {
    const publicProfile = buildPublicProfile(merged);
    const publicResult = pushGistFiles(cfg.publicGistId, {
      "cc-proficiency-public.json": JSON.stringify(publicProfile, null, 2),
    });
    if (!publicResult.success) {
      logError(`Public profile update failed: ${publicResult.error}`);
    }
  }

  return { success: true, merged, totals };
}

export function pushToGist(): void {
  const config = loadConfig();
  const store = loadStore();

  if (!store.lastResult) {
    console.log(t().common.noAnalysisData);
    return;
  }

  const tokenWindows = computeTokenWindows(store.tokenLog);
  const svg = renderBadge(store.lastResult, tokenWindows);
  saveBadge(svg);

  if (!isGhAuthenticated() || !config.gistId) {
    if (!isGhAuthenticated()) {
      console.log(t().common.ghNotAuthenticated);
      console.log(t().common.ghNotAuthenticatedHint);
    }
    if (!config.gistId) {
      console.log(t().common.noGistConfigured);
    }
    console.log(t().common.badgeSavedLocally(getBadgePath()));
    return;
  }

  // Build config snapshot from current config (no re-scan inside mergeAndPush)
  const localConfig = parseClaudeConfig(store.knownProjectCwds);
  const existingSnapshots = readGistFile(config.gistId, "config-snapshots.json");
  const parsedSnapshots = existingSnapshots ? parseSnapshotsFile(existingSnapshots) : null;
  const configSnapshotJson = JSON.stringify(buildSnapshotPayload(parsedSnapshots, localConfig));

  const result = mergeAndPush(
    store,
    store.lastResult,
    config.gistId,
    config.username ?? "unknown",
    true,
    configSnapshotJson
  );

  if (!result.success) {
    console.log(t().services.publishing.pushFailed(result.error ?? "unknown"));
  }
}
