#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
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

function getVersion(): string {
  try {
    // dist/cli/index.js -> ../../package.json
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8"));
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}

function printUsage(): void {
  console.log(`
cc-proficiency \u2014 Claude Code Proficiency Badge Generator

Commands:
  init                  Set up configuration and hooks
  analyze [--full]      Analyze sessions and compute scores
  process               Process queued sessions from hook
  badge [--output <f>]  Generate SVG badge
  push                  Upload badge to GitHub Gist
  explain               Show score drivers and improvement tips
  status                Show hook activity, queue, and config
  config [key] [value]  View or set configuration
  uninstall             Remove hooks and clean up
  version               Show version info

Examples:
  cc-proficiency init
  cc-proficiency analyze --full
  cc-proficiency badge --output badge.svg
  cc-proficiency explain
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "init":
      return await cmdInit();
    case "analyze":
      return cmdAnalyze(args);
    case "process":
      return cmdProcess();
    case "badge":
      return cmdBadge(args);
    case "push":
      return cmdPush();
    case "explain":
      return cmdExplain();
    case "achievements":
      return cmdAchievements();
    case "status":
      return cmdStatus();
    case "config":
      return cmdConfig(args.slice(1));
    case "uninstall":
      return cmdUninstall();
    case "version":
      console.log(`cc-proficiency v${getVersion()} (scoring ${SCORING_VERSION})`);
      return;
    default:
      printUsage();
      return;
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
