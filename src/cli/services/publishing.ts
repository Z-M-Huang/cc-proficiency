import { renderBadge } from "../../renderer/svg.js";
import { loadStore, loadConfig, saveBadge, getBadgePath } from "../../store/local-store.js";
import { isGhAuthenticated, getGistRawUrl, readGistFile, pushGistFiles } from "../../gist/uploader.js";
import { emptyRemoteStore, parseRemoteStore, mergeIntoRemote, getTotalStats, getUTCDate, getWeekMonday, mergeWeeklyTrends } from "../../store/remote-store.js";
import { checkAchievements, getAchievementDef } from "../../store/achievements.js";
import { getConfigLocale } from "../utils/locale.js";
import type { WeeklyTrend } from "../../types.js";

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

  const remoteJson = readGistFile(config.gistId, "cc-proficiency.json");
  let remote = remoteJson ? parseRemoteStore(remoteJson) : null;
  if (!remote) remote = emptyRemoteStore(config.username ?? "unknown");

  const avgHours = store.lastResult.features.totalHours / Math.max(store.processedSessionIds.length, 1);
  const localSessions = store.processedSessionIds.map((id) => {
    const snap = store.snapshots.find((s) => s.sessionId === id);
    return {
      id,
      date: snap ? getUTCDate(snap.timestamp) : new Date().toISOString().slice(0, 10),
      hours: avgHours,
    };
  });

  const merged = mergeIntoRemote(remote, localSessions, store.lastResult);

  const totals = getTotalStats(merged);
  const ctx = {
    totalSessions: totals.sessions,
    totalHours: totals.hours,
    totalProjects: totals.projects,
    domains: merged.domains,
    streak: merged.streak,
    features: store.lastResult.features,
    activeDates: merged.streak.activeDates,
  };
  const newAchievements = checkAchievements(ctx, merged.achievements.map((a) => a.id));
  for (const id of newAchievements) {
    merged.achievements.push({ id, unlockedAt: new Date().toISOString() });
    const def = getAchievementDef(id);
    if (def) console.log(`  \uD83C\uDFC6 Achievement unlocked: ${def.icon} ${def.name}`);
  }

  const thisWeek = getWeekMonday(new Date().toISOString());
  const localTrend: WeeklyTrend = {
    week: thisWeek,
    domains: Object.fromEntries(store.lastResult.domains.map((d) => [d.id, d.score])),
    hours: store.lastResult.features.totalHours,
    sessions: store.lastResult.sessionCount,
  };
  merged.weeklyTrends = mergeWeeklyTrends(merged.weeklyTrends, [localTrend]);

  store.lastResult.streak = merged.streak.current;
  store.lastResult.achievementCount = merged.achievements.length;
  const finalSvg = renderBadge(store.lastResult, getConfigLocale());
  saveBadge(finalSvg);

  const pushResult = pushGistFiles(config.gistId, {
    "cc-proficiency.svg": finalSvg,
    "cc-proficiency.json": JSON.stringify(merged, null, 2),
  });

  if (pushResult.success) {
    const rawUrl = getGistRawUrl(config.username ?? "", config.gistId);
    console.log("\u2713 Badge + data pushed to Gist");
    console.log(`  ${rawUrl}`);
    console.log(`  ${totals.sessions} sessions \u00B7 ${totals.hours.toFixed(1)}h \u00B7 ${merged.achievements.length} achievements \u00B7 \uD83D\uDD25 ${merged.streak.current}d streak`);
  } else {
    console.log(`\u2717 Push failed: ${pushResult.error}`);
  }
}
