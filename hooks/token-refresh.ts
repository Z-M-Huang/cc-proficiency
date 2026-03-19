#!/usr/bin/env node

/**
 * Stop hook for token refresh.
 * Checks if badge is stale (>30 min) and spawns a lightweight refresh.
 * Must exit 0 in <1 second.
 */

import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, appendFileSync, mkdirSync, writeFileSync, statSync } from "node:fs";

const STORE_DIR = join(homedir(), ".cc-proficiency");
const BADGE_FILE = join(STORE_DIR, "cc-proficiency.svg");
const HOOK_LOG = join(STORE_DIR, "hook.log");
const MAX_LOG_SIZE = 500_000;
const STALE_MS = 30 * 60 * 1000; // 30 minutes

function log(msg: string): void {
  try {
    if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
    if (existsSync(HOOK_LOG)) {
      try {
        if (statSync(HOOK_LOG).size > MAX_LOG_SIZE) writeFileSync(HOOK_LOG, "", "utf-8");
      } catch { /* ignore */ }
    }
    const ts = new Date().toISOString();
    appendFileSync(HOOK_LOG, `[${ts}] ${msg}\n`, "utf-8");
  } catch { /* logging must never crash the hook */ }
}

// CI/CD detection — skip if non-interactive
// Duplicated from src/utils/ci-detect.ts — keep in sync
const CI_VARS = ["CI", "GITHUB_ACTIONS", "GITLAB_CI", "CODESPACES", "BUILDKITE", "CIRCLECI", "TRAVIS"];
if (CI_VARS.some((v) => process.env[v] === "true") || process.env.JENKINS_URL) {
  process.exit(0);
}

// Read stdin (hook payload — consumed but not used for refresh)
process.stdin.setEncoding("utf-8");
process.stdin.on("data", () => { /* consume stdin */ });
process.stdin.on("end", () => {
  try {
    // Check badge file staleness (mtime reflects actual render time)
    if (!existsSync(BADGE_FILE)) {
      process.exit(0);
    }

    const age = Date.now() - statSync(BADGE_FILE).mtimeMs;
    if (age < STALE_MS) {
      process.exit(0); // not stale
    }

    // Badge is stale — spawn refresh
    const processorPath = join(__dirname, "..", "cli", "index.js");
    if (existsSync(processorPath)) {
      const child = spawn("node", [processorPath, "refresh"], {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
      log(`REFRESH: badge stale (${Math.round(age / 60000)}m), spawned pid=${child.pid}`);
    }
  } catch (err) {
    log(`REFRESH-ERROR: ${err}`);
  }

  process.exit(0);
});

// Timeout safety
setTimeout(() => {
  process.exit(0);
}, 4000);
