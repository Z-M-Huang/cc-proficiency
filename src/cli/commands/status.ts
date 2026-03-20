import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadStore, loadConfig, getStoreDir } from "../../store/local-store.js";
import { readQueue } from "../../store/queue.js";
import { t } from "../../i18n/index.js";

export function cmdStatus(): void {
  const hookLogPath = join(getStoreDir(), "hook.log");
  const store = loadStore();
  const config = loadConfig();
  const s = t().cli.status;

  console.log(`\n${s.title}\n`);

  console.log(`${s.username}    ${config.username ?? s.notSet}`);
  console.log(`${s.gistId}     ${config.gistId ?? s.notSet}`);
  console.log(`${s.autoUpload} ${config.autoUpload}`);
  console.log(`${s.locale}      ${config.locale ?? "en"}`);
  console.log(`${s.leaderboardLabel} ${config.leaderboard ? s.joined(config.publicGistId ?? s.pending) : s.notJoined}`);

  console.log(`\n${s.sessionsProcessed} ${store.processedSessionIds.length}`);
  console.log(`${s.lastUpdated}       ${store.lastUpdated ?? s.never}`);

  const queue = readQueue();
  console.log(`${s.queuePending}      ${queue.length}`);

  if (existsSync(hookLogPath)) {
    const log = readFileSync(hookLogPath, "utf-8").trim().split("\n");
    const recent = log.slice(-10);
    console.log(`\n${s.hookLog(recent.length)}`);
    for (const line of recent) {
      console.log(`    ${line}`);
    }

    const lastQueued = log.filter((l) => l.includes("QUEUED")).pop();
    if (lastQueued) {
      const match = lastQueued.match(/\[(.*?)\]/);
      console.log(`\n${s.lastHookFired(match ? match[1]! : "unknown")}`);
    }
  } else {
    console.log(`\n${s.noHookEntries}`);
  }

  const lockPath = join(getStoreDir(), "queue.lock");
  if (existsSync(lockPath)) {
    try {
      const lockTime = parseInt(readFileSync(lockPath, "utf-8"), 10);
      const age = Math.round((Date.now() - lockTime) / 1000);
      console.log(`${s.queueLock}  ${s.queueLockHeld(age)}${age > 60 ? s.queueLockStale : ""}`);
    } catch {
      console.log(`${s.queueLock}  ${s.queueLockPresent}`);
    }
  } else {
    console.log(`${s.queueLock}  ${s.queueLockNone}`);
  }

  console.log("");
}
