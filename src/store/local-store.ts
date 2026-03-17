import { readFileSync, writeFileSync, existsSync, statSync, appendFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { LocalStore, SessionSnapshot, ProficiencyResult, CCProficiencyConfig } from "../types.js";
import { ensureStoreDir } from "./queue.js";

const STORE_DIR = join(homedir(), ".cc-proficiency");
const STORE_FILE = join(STORE_DIR, "store.json");
const CONFIG_FILE = join(STORE_DIR, "config.json");
const BADGE_FILE = join(STORE_DIR, "cc-proficiency.svg");
const ERROR_LOG = join(STORE_DIR, "error.log");
const MAX_ERROR_LOG_SIZE = 1_000_000; // 1MB
const RETENTION_DAYS = 90;

function emptyStore(): LocalStore {
  return {
    processedSessionIds: [],
    snapshots: [],
    lastResult: undefined,
    lastUpdated: undefined,
  };
}

export function loadStore(): LocalStore {
  ensureStoreDir();
  if (!existsSync(STORE_FILE)) return emptyStore();

  try {
    return JSON.parse(readFileSync(STORE_FILE, "utf-8"));
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: LocalStore): void {
  ensureStoreDir();
  store.lastUpdated = new Date().toISOString();

  // Prune old snapshots (>90 days)
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  store.snapshots = store.snapshots.filter((s) => {
    const ts = new Date(s.timestamp).getTime();
    return !isNaN(ts) && ts > cutoff;
  });

  const tmpFile = join(STORE_DIR, ".store.json.tmp");
  writeFileSync(tmpFile, JSON.stringify(store, null, 2), "utf-8");
  renameSync(tmpFile, STORE_FILE);
}

export function isSessionProcessed(store: LocalStore, sessionId: string): boolean {
  return store.processedSessionIds.includes(sessionId);
}

export function addSnapshot(store: LocalStore, snapshot: SessionSnapshot): void {
  store.processedSessionIds.push(snapshot.sessionId);
  store.snapshots.push(snapshot);
}

export function loadConfig(): CCProficiencyConfig {
  ensureStoreDir();
  if (!existsSync(CONFIG_FILE)) {
    return { autoUpload: true, public: false };
  }
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return { autoUpload: true, public: false };
  }
}

export function saveConfig(config: CCProficiencyConfig): void {
  ensureStoreDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function saveBadge(svg: string): string {
  ensureStoreDir();
  writeFileSync(BADGE_FILE, svg, "utf-8");
  return BADGE_FILE;
}

export function getBadgePath(): string {
  return BADGE_FILE;
}

export function logError(message: string): void {
  ensureStoreDir();
  try {
    // Check size and rotate if needed
    if (existsSync(ERROR_LOG)) {
      const stat = statSync(ERROR_LOG);
      if (stat.size > MAX_ERROR_LOG_SIZE) {
        writeFileSync(ERROR_LOG, "", "utf-8"); // truncate
      }
    }
    const timestamp = new Date().toISOString();
    appendFileSync(ERROR_LOG, `[${timestamp}] ${message}\n`, "utf-8");
  } catch {
    // can't log — silently fail
  }
}

export function getStoreDir(): string {
  return STORE_DIR;
}
