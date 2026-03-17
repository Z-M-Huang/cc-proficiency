import { readFileSync, writeFileSync, appendFileSync, existsSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { QueueEntry } from "../types.js";

const STORE_DIR = join(homedir(), ".cc-proficiency");
const QUEUE_FILE = join(STORE_DIR, "queue.jsonl");
const QUEUE_LOCK = join(STORE_DIR, "queue.lock");
const LOCK_STALE_MS = 120_000; // 120 seconds (accounts for network calls in mergeAndPush)

export function ensureStoreDir(): void {
  if (!existsSync(STORE_DIR)) {
    mkdirSync(STORE_DIR, { recursive: true });
  }
}

/**
 * Append a queue entry (called by the hook, must be fast).
 */
export function enqueue(entry: QueueEntry): void {
  ensureStoreDir();
  appendFileSync(QUEUE_FILE, JSON.stringify(entry) + "\n", "utf-8");
}

/**
 * Read all queue entries.
 */
export function readQueue(): QueueEntry[] {
  if (!existsSync(QUEUE_FILE)) return [];

  const entries: QueueEntry[] = [];
  const content = readFileSync(QUEUE_FILE, "utf-8");
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed
    }
  }
  return entries;
}

/**
 * Atomically replace queue with remaining entries.
 * Re-reads queue to merge any entries appended during processing (race-safe).
 */
export function writeQueue(processedIds: Set<string>): void {
  ensureStoreDir();
  // Re-read to catch entries appended since we started processing
  const current = readQueue();
  const remaining = current.filter((e) => !processedIds.has(e.sessionId));
  const tmpFile = join(STORE_DIR, ".queue.jsonl.tmp");
  const content = remaining.map((e) => JSON.stringify(e)).join("\n") + (remaining.length > 0 ? "\n" : "");
  writeFileSync(tmpFile, content, "utf-8");
  renameSync(tmpFile, QUEUE_FILE);
}

/**
 * Acquire queue lock. Returns true if acquired, false if held by another process.
 */
export function acquireLock(): boolean {
  ensureStoreDir();

  if (existsSync(QUEUE_LOCK)) {
    // Check if stale
    try {
      const lockContent = readFileSync(QUEUE_LOCK, "utf-8");
      const lockTime = parseInt(lockContent, 10);
      if (Date.now() - lockTime < LOCK_STALE_MS) {
        return false; // lock is fresh, another process is running
      }
      // Stale lock — break it
      unlinkSync(QUEUE_LOCK);
    } catch {
      // Can't read lock — try to acquire anyway
      try { unlinkSync(QUEUE_LOCK); } catch { /* ignore */ }
    }
  }

  try {
    writeFileSync(QUEUE_LOCK, String(Date.now()), { flag: "wx" }); // O_EXCL
    return true;
  } catch {
    return false; // another process beat us
  }
}

/**
 * Release queue lock.
 */
export function releaseLock(): void {
  try {
    unlinkSync(QUEUE_LOCK);
  } catch {
    // already released
  }
}
