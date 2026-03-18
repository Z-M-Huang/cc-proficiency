import { fetchLeaderboard } from "../services/leaderboard.js";
import { loadConfig } from "../../store/local-store.js";

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

  if (entries.length === 0) {
    console.log("Leaderboard unavailable. Try again later.");
    return;
  }

  const config = loadConfig();
  const myUsername = config.username;

  console.log(`\n  cc-proficiency Leaderboard (${entries.length} users)`);
  console.log("  " + "\u2500".repeat(58));
  console.log("   #  User             Avg   CC   Tool  Agen  Prmp  Ctx");
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

  const cacheNote = fromCache ? " (cached)" : "";
  const skipNote = skipped > 0 ? ` (${skipped} skipped)` : "";
  console.log(`  ${entries.length} users${skipNote} \u00B7 Updated ${getTimeAgo(fromCache)}${cacheNote}`);

  console.log("\n  --sort=<avg|cc-mastery|tool-mcp|agentic|prompt-craft|context-mgmt|hours|streak>");
  console.log("  --limit=N (default 20)\n");
}

function getDomainScores(entry: { domains: Array<{ id: string; score: number }> }): string {
  const ids = ["cc-mastery", "tool-mcp", "agentic", "prompt-craft", "context-mgmt"];
  return ids.map((id) => {
    const d = entry.domains.find((x) => x.id === id);
    return String(d?.score ?? 0).padStart(4);
  }).join(" ");
}

function getTimeAgo(fromCache: boolean): string {
  if (!fromCache) return "just now";
  return "recently";
}
