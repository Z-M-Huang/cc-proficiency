import { fetchLeaderboard } from "../services/leaderboard.js";
import { loadConfig } from "../../store/local-store.js";
import { t } from "../../i18n/index.js";

export function cmdLeaderboard(args: string[]): void {
  // Parse --sort and --limit
  let sortBy = "avg";
  let limit = 20;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith("--sort=")) {
      sortBy = arg.slice(7);
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.slice(8), 10) || 20;
    }
  }

  const { entries, fromCache, skipped } = fetchLeaderboard(sortBy, limit);
  const s = t().cli.leaderboard;

  if (entries.length === 0) {
    console.log(s.unavailable);
    return;
  }

  const config = loadConfig();
  const myUsername = config.username;

  console.log(`\n${s.title(entries.length)}`);
  console.log("  " + "\u2500".repeat(58));
  console.log(s.columnHeader);
  console.log("  " + "\u2500".repeat(58));

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    const rank = String(i + 1).padStart(3);
    const user = `@${e.username}`.padEnd(16);
    const avg = String(e.averageScore).padStart(3);
    const scores = getDomainScores(e);
    const marker = e.username === myUsername ? " \u25C4" : "";

    console.log(`  ${rank}  ${user} ${avg}  ${scores}${marker}`);
  }

  console.log("  " + "\u2500".repeat(58));

  const cacheNote = fromCache ? s.cached : "";
  console.log(`  ${s.users(entries.length, skipped)} \u00B7 Updated ${getTimeAgo(fromCache)}${cacheNote}`);

  console.log(`\n${s.sortHelp}`);
  console.log(s.limitHelp + "\n");
}

function getDomainScores(entry: { domains: Array<{ id: string; score: number }> }): string {
  const ids = ["cc-mastery", "tool-mcp", "agentic", "prompt-craft", "context-mgmt"];
  return ids.map((id) => {
    const d = entry.domains.find((x) => x.id === id);
    return String(d?.score ?? 0).padStart(4);
  }).join(" ");
}

function getTimeAgo(fromCache: boolean): string {
  const s = t().cli.leaderboard;
  if (!fromCache) return s.updatedJustNow;
  return s.updatedRecently;
}
