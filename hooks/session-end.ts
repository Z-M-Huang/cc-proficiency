#!/usr/bin/env node

/**
 * Stop hook for cc-proficiency.
 * Reads session info from stdin, appends to queue, spawns processor.
 * Must exit 0 in <1 second.
 */

import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { appendFileSync, existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";

const STORE_DIR = join(homedir(), ".cc-proficiency");
const QUEUE_FILE = join(STORE_DIR, "queue.jsonl");
const HOOK_LOG = join(STORE_DIR, "hook.log");
const MAX_LOG_SIZE = 500_000; // 500KB

function log(msg: string): void {
  try {
    if (!existsSync(STORE_DIR)) mkdirSync(STORE_DIR, { recursive: true });
    // Rotate if too large
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
const CI_VARS = ["CI", "GITHUB_ACTIONS", "GITLAB_CI", "CODESPACES", "BUILDKITE", "CIRCLECI", "TRAVIS"];
if (CI_VARS.some((v) => process.env[v] === "true") || process.env.JENKINS_URL) {
  log("SKIP: CI environment detected");
  process.exit(0);
}

// Read stdin (hook payload)
let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  try {
    const payload = JSON.parse(input);
    const entry = {
      sessionId: payload.session_id ?? "",
      transcriptPath: payload.transcript_path ?? "",
      cwd: payload.cwd ?? "",
      timestamp: new Date().toISOString(),
    };

    if (!entry.sessionId || !entry.transcriptPath) {
      log(`SKIP: missing session_id or transcript_path`);
      process.exit(0);
    }

    // Ensure store dir
    if (!existsSync(STORE_DIR)) {
      mkdirSync(STORE_DIR, { recursive: true });
    }

    // Append to queue
    appendFileSync(QUEUE_FILE, JSON.stringify(entry) + "\n", "utf-8");
    log(`QUEUED: session=${entry.sessionId} cwd=${entry.cwd}`);

    // Spawn processor as detached child (fire-and-forget)
    try {
      // When compiled: dist/hooks/session-end.js → dist/cli.js is at ../cli.js
      const processorPath = join(__dirname, "..", "cli.js");
      if (existsSync(processorPath)) {
        const child = spawn("node", [processorPath, "process"], {
          detached: true,
          stdio: "ignore",
        });
        child.unref();
        log(`SPAWNED: processor pid=${child.pid}`);
      } else {
        log(`WARN: processor not found at ${processorPath}`);
      }
    } catch (err) {
      log(`ERROR: spawn failed: ${err}`);
    }
  } catch (err) {
    log(`ERROR: ${err}`);
  }

  process.exit(0);
});

// Timeout safety — exit after 4 seconds regardless
setTimeout(() => {
  log("TIMEOUT: hook exceeded 4s, force exit");
  process.exit(0);
}, 4000);
