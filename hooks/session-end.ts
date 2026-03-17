#!/usr/bin/env node

/**
 * Stop hook for cc-proficiency.
 * Reads session info from stdin, appends to queue, spawns processor.
 * Must exit 0 in <1 second.
 */

import { spawn } from "node:child_process";
import { join } from "node:path";
import { homedir } from "node:os";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";

const STORE_DIR = join(homedir(), ".cc-proficiency");
const QUEUE_FILE = join(STORE_DIR, "queue.jsonl");

// CI/CD detection — skip if non-interactive
const CI_VARS = ["CI", "GITHUB_ACTIONS", "GITLAB_CI", "CODESPACES", "BUILDKITE", "CIRCLECI", "TRAVIS"];
if (CI_VARS.some((v) => process.env[v] === "true") || process.env.JENKINS_URL) {
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
      process.exit(0);
    }

    // Ensure store dir
    if (!existsSync(STORE_DIR)) {
      mkdirSync(STORE_DIR, { recursive: true });
    }

    // Append to queue
    appendFileSync(QUEUE_FILE, JSON.stringify(entry) + "\n", "utf-8");

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
      }
    } catch {
      // Processor spawn failed — user can run manually
    }
  } catch {
    // Invalid JSON or other error — exit cleanly
  }

  process.exit(0);
});

// Timeout safety — exit after 4 seconds regardless
setTimeout(() => process.exit(0), 4000);
