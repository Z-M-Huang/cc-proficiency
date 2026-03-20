import { loadStore, loadConfig } from "../../store/local-store.js";
import { isGhAuthenticated, readGistFile } from "../../gist/uploader.js";
import { parseRemoteStore } from "../../store/remote-store.js";
import { checkAchievements, ACHIEVEMENTS } from "../../store/achievements.js";
import { progressBar } from "../utils/formatting.js";
import { t } from "../../i18n/index.js";

export function cmdAchievements(): void {
  const store = loadStore();
  const config = loadConfig();

  if (!store.lastResult) {
    console.log(t().common.noAnalysisData);
    return;
  }

  let unlockedIds: string[] = [];
  if (config.gistId && isGhAuthenticated()) {
    const remoteJson = readGistFile(config.gistId, "cc-proficiency.json");
    const remote = remoteJson ? parseRemoteStore(remoteJson) : null;
    if (remote) {
      unlockedIds = remote.achievements.map((a) => a.id);
    }
  }

  const result = store.lastResult;
  const ctx = {
    totalSessions: result.sessionCount,
    totalHours: result.features.totalHours,
    totalProjects: result.projectCount,
    domains: result.domains,
    streak: { current: 0, longest: 0 },
    features: result.features,
    activeDates: [],
    leaderboard: config.leaderboard ?? false,
  };

  const newLocal = checkAchievements(ctx, unlockedIds);
  const allUnlocked = new Set([...unlockedIds, ...newLocal]);

  console.log(`\n${t().cli.achievements.title(allUnlocked.size, ACHIEVEMENTS.length)}\n`);

  for (const achievement of ACHIEVEMENTS) {
    const unlocked = allUnlocked.has(achievement.id);
    const { current, target } = achievement.progress(ctx);
    const pct = Math.min(100, Math.round((current / target) * 100));
    const bar = progressBar(pct, 12);

    const name = t().achievements[achievement.id]?.name ?? achievement.id;
    if (unlocked) {
      console.log(`  ${achievement.icon} ${name.padEnd(18)} ${bar} ${t().cli.achievements.done}`);
    } else {
      console.log(`  \u2591  ${name.padEnd(18)} ${bar} ${current}/${target}`);
    }
  }
  console.log("");
}
