import type { AchievementDef, AchievementContext } from "../types.js";

/**
 * Built-in achievement definitions.
 * Display text (name/description) lives in locale files keyed by achievement id.
 * Adding a new achievement = adding one object here + locale entries.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // Session milestones
  {
    id: "first-session",
    icon: "\uD83D\uDC63", // 👣
    progress: (ctx) => ({ current: Math.min(ctx.totalSessions, 1), target: 1 }),
  },
  {
    id: "ten-sessions",
    icon: "\uD83C\uDF31", // 🌱
    progress: (ctx) => ({ current: Math.min(ctx.totalSessions, 10), target: 10 }),
  },
  {
    id: "century-club",
    icon: "\uD83D\uDCAF", // 💯
    progress: (ctx) => ({ current: Math.min(ctx.totalSessions, 100), target: 100 }),
  },

  // Hours milestones
  {
    id: "hour-10",
    icon: "\u23F1", // ⏱
    progress: (ctx) => ({ current: Math.min(Math.round(ctx.totalHours), 10), target: 10 }),
  },
  {
    id: "hour-100",
    icon: "\uD83C\uDFC5", // 🏅
    progress: (ctx) => ({ current: Math.min(Math.round(ctx.totalHours), 100), target: 100 }),
  },

  // Score milestones
  {
    id: "perfect-domain",
    icon: "\u2B50", // ⭐
    progress: (ctx) => {
      const max = Math.max(0, ...ctx.domains.map((d) => d.score));
      return { current: max, target: 100 };
    },
  },
  {
    id: "all-above-50",
    icon: "\uD83C\uDFAF", // 🎯
    progress: (ctx) => {
      const above = ctx.domains.filter((d) => d.score >= 50).length;
      return { current: above, target: 5 };
    },
  },
  {
    id: "all-above-80",
    icon: "\uD83C\uDFC6", // 🏆
    progress: (ctx) => {
      const above = ctx.domains.filter((d) => d.score >= 80).length;
      return { current: above, target: 5 };
    },
  },

  // Streak milestones
  {
    id: "streak-7",
    icon: "\uD83D\uDD25", // 🔥
    progress: (ctx) => ({ current: Math.min(ctx.streak.longest, 7), target: 7 }),
  },
  {
    id: "streak-30",
    icon: "\uD83D\uDCAA", // 💪
    progress: (ctx) => ({ current: Math.min(ctx.streak.longest, 30), target: 30 }),
  },

  // Feature milestones
  {
    id: "multi-project-5",
    icon: "\uD83D\uDDFA", // 🗺
    progress: (ctx) => ({ current: Math.min(ctx.totalProjects, 5), target: 5 }),
  },
  {
    id: "agent-master",
    icon: "\uD83E\uDD16", // 🤖
    progress: (ctx) => {
      const types = ctx.features.featureScores?.agents ?? 0;
      return { current: types > 0 ? Math.min(3, 3) : 0, target: 3 }; // simplified — based on feature score
    },
  },
  {
    id: "mcp-explorer",
    icon: "\uD83D\uDD0C", // 🔌
    progress: (ctx) => ({ current: Math.min(ctx.features.mcpServers.length, 2), target: 2 }),
  },
  {
    id: "night-owl",
    icon: "\uD83E\uDD89", // 🦉
    progress: (ctx) => {
      const hasLateSession = ctx.activeDates.length > 0; // simplified — would need session timestamps
      return { current: hasLateSession ? 1 : 0, target: 1 };
    },
  },
  // Leaderboard
  {
    id: "community-member",
    icon: "\uD83C\uDF10", // 🌐
    progress: (ctx) => ({ current: ctx.leaderboard ? 1 : 0, target: 1 }),
  },
];

/**
 * Check all achievements against current context.
 * Returns newly unlocked achievement IDs.
 */
export function checkAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: string[]
): string[] {
  const newlyUnlocked: string[] = [];
  const unlockedSet = new Set(alreadyUnlocked);

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedSet.has(achievement.id)) continue;
    const { current, target } = achievement.progress(ctx);
    if (current >= target) {
      newlyUnlocked.push(achievement.id);
    }
  }

  return newlyUnlocked;
}

/**
 * Get achievement definition by ID.
 */
export function getAchievementDef(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
