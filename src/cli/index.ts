#!/usr/bin/env node

import { SCORING_VERSION } from "../scoring/engine.js";
import { cmdInit } from "./commands/init.js";
import { cmdAnalyze } from "./commands/analyze.js";
import { cmdProcess } from "./commands/process.js";
import { cmdBadge } from "./commands/badge.js";
import { cmdPush } from "./commands/push.js";
import { cmdExplain } from "./commands/explain.js";
import { cmdAchievements } from "./commands/achievements.js";
import { cmdStatus } from "./commands/status.js";
import { cmdConfig } from "./commands/config.js";
import { cmdUninstall } from "./commands/uninstall.js";
import { cmdShare } from "./commands/share.js";
import { cmdLeaderboard } from "./commands/leaderboard.js";
import { cmdUpdate } from "./commands/update.js";
import { cmdRefresh } from "./commands/refresh.js";
import { checkForUpdates } from "./utils/update-check.js";
import { getVersion } from "./utils/version.js";
import { initLocale, t } from "../i18n/index.js";
import { loadConfig } from "../store/local-store.js";

function printUsage(): void {
  const h = t().cli.help;
  const c = h.commands;
  console.log(`
${h.description}

Commands:
  init                  ${c.init}
  analyze [--full]      ${c.analyze}
  process               ${c.process}
  badge [--output <f>]  ${c.badge}
  push                  ${c.push}
  refresh [--force]     ${c.refresh}
  explain               ${c.explain}
  status                ${c.status}
  config [key] [value]  ${c.config}
  share [--remove]      ${c.share}
  leaderboard           ${c.leaderboard}
  update                ${c.update}
  uninstall             ${c.uninstall}
  version               ${c.version}

Examples:
${h.examples}
`);
}

// Commands that should check for updates (interactive, not hook-spawned)
const UPDATE_CHECK_COMMANDS = new Set([
  "analyze", "explain", "badge", "status", "version", "achievements", "leaderboard",
]);

async function main(): Promise<void> {
  const cfg = loadConfig();
  initLocale(cfg.locale);

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "init":
      return await cmdInit();
    case "analyze":
      await cmdAnalyze(args);
      break;
    case "process":
      return cmdProcess();
    case "badge":
      await cmdBadge(args);
      break;
    case "push":
      return cmdPush();
    case "explain":
      await cmdExplain();
      break;
    case "achievements":
      await cmdAchievements();
      break;
    case "status":
      await cmdStatus();
      break;
    case "config":
      return cmdConfig(args.slice(1));
    case "share":
      return cmdShare(args);
    case "leaderboard":
      await cmdLeaderboard(args);
      break;
    case "refresh":
      return cmdRefresh(args);
    case "update":
      return cmdUpdate();
    case "uninstall":
      return cmdUninstall();
    case "version":
      console.log(`cc-proficiency v${getVersion()} (scoring ${SCORING_VERSION})`);
      break;
    default:
      printUsage();
      return;
  }

  if (command && UPDATE_CHECK_COMMANDS.has(command)) {
    await checkForUpdates(getVersion()).catch(() => {});
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
