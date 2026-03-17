import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadStore, loadConfig, getStoreDir } from "../../store/local-store.js";
import { readQueue } from "../../store/queue.js";

export function cmdStatus(): void {
  const hookLogPath = join(getStoreDir(), "hook.log");
  const store = loadStore();
  const config = loadConfig();

  console.log("\n  cc-proficiency status\n");

  console.log(`  Username:    ${config.username ?? "(not set)"}`);
  console.log(`  Gist ID:     ${config.gistId ?? "(not set)"}`);
  console.log(`  Auto-upload: ${config.autoUpload}`);
  console.log(`  Locale:      ${config.locale ?? "en"}`);

  console.log(`\n  Sessions processed: ${store.processedSessionIds.length}`);
  console.log(`  Last updated:       ${store.lastUpdated ?? "never"}`);

  const queue = readQueue();
  console.log(`  Queue pending:      ${queue.length}`);

  if (existsSync(hookLogPath)) {
    const log = readFileSync(hookLogPath, "utf-8").trim().split("\n");
    const recent = log.slice(-10);
    console.log(`\n  Hook log (last ${recent.length} entries):`);
    for (const line of recent) {
      console.log(`    ${line}`);
    }

    const lastQueued = log.filter((l) => l.includes("QUEUED")).pop();
    if (lastQueued) {
      const match = lastQueued.match(/\[(.*?)\]/);
      console.log(`\n  Last hook fired: ${match ? match[1] : "unknown"}`);
    }
  } else {
    console.log("\n  Hook log: no entries yet (hook hasn't fired)");
  }

  const lockPath = join(getStoreDir(), "queue.lock");
  if (existsSync(lockPath)) {
    try {
      const lockTime = parseInt(readFileSync(lockPath, "utf-8"), 10);
      const age = Math.round((Date.now() - lockTime) / 1000);
      console.log(`  Queue lock:  held (${age}s ago)${age > 60 ? " \u2190 STALE" : ""}`);
    } catch {
      console.log("  Queue lock:  present (unknown age)");
    }
  } else {
    console.log("  Queue lock:  none");
  }

  console.log("");
}
