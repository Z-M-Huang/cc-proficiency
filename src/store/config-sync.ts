import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { readGistFile } from "../gist/uploader.js";
import { logError } from "./local-store.js";
import { ensureStoreDir } from "./queue.js";
import type { ConfigSignals } from "../parsers/config-parser.js";
import type { ConfigSnapshot, ConfigSnapshotsFile, SyncableConfigSignals } from "../types.js";

const STALE_DAYS = 30;
const MACHINE_ID_FILE = join(homedir(), ".cc-proficiency", "machine-id");

// ── Pure Functions ──

/**
 * Read or generate+persist a random machine ID (8 hex chars from UUID v4).
 */
export function getMachineId(): string {
  ensureStoreDir();
  if (existsSync(MACHINE_ID_FILE)) {
    const existing = readFileSync(MACHINE_ID_FILE, "utf-8").trim();
    if (/^[0-9a-f]{8}$/.test(existing)) return existing;
  }
  const id = randomUUID().replace(/-/g, "").slice(0, 8);
  writeFileSync(MACHINE_ID_FILE, id, "utf-8");
  return id;
}

/**
 * Strip pluginNames from ConfigSignals for privacy-safe syncing.
 */
export function toSyncable(config: ConfigSignals): SyncableConfigSignals {
  const { pluginNames: _, ...rest } = config;
  return rest;
}

function effortRank(level: string): number {
  if (level === "high") return 2;
  if (level === "normal") return 1;
  return 0;
}

/**
 * Merge local ConfigSignals with remote snapshots.
 * Booleans: OR. Counts: MAX. effortLevel: highest rank.
 * pluginNames kept from local only.
 */
export function mergeConfigSignals(
  local: ConfigSignals,
  snapshots: ConfigSnapshot[]
): ConfigSignals {
  if (snapshots.length === 0) return local;

  const merged: ConfigSignals = { ...local, pluginNames: [...local.pluginNames] };

  for (const snapshot of snapshots) {
    const s = snapshot.signals;
    merged.hasGlobalClaudeMd = merged.hasGlobalClaudeMd || s.hasGlobalClaudeMd;
    merged.globalClaudeMdHasImports = merged.globalClaudeMdHasImports || s.globalClaudeMdHasImports;
    merged.hasCustomHooks = merged.hasCustomHooks || s.hasCustomHooks;
    merged.hasRulesFiles = merged.hasRulesFiles || s.hasRulesFiles;
    merged.hasMcpServers = merged.hasMcpServers || s.hasMcpServers;
    merged.hasMemoryFiles = merged.hasMemoryFiles || s.hasMemoryFiles;
    merged.hasCustomAgents = merged.hasCustomAgents || s.hasCustomAgents;
    merged.hasCustomSkills = merged.hasCustomSkills || s.hasCustomSkills;

    merged.projectClaudeMdCount = Math.max(merged.projectClaudeMdCount, s.projectClaudeMdCount);
    merged.hookWithMatcherCount = Math.max(merged.hookWithMatcherCount, s.hookWithMatcherCount);
    merged.pluginCount = Math.max(merged.pluginCount, s.pluginCount);
    merged.rulesFileCount = Math.max(merged.rulesFileCount, s.rulesFileCount);
    merged.memoryFileCount = Math.max(merged.memoryFileCount, s.memoryFileCount);
    merged.activeMemoryFileCount = Math.max(merged.activeMemoryFileCount, s.activeMemoryFileCount);

    if (s.effortLevel && effortRank(s.effortLevel) > effortRank(merged.effortLevel)) {
      merged.effortLevel = s.effortLevel;
    }
  }

  return merged;
}

/**
 * Build a ConfigSnapshotsFile by upserting the local machine's snapshot
 * and pruning stale entries (>30 days). Pure — no gist I/O.
 */
export function buildSnapshotPayload(
  existing: ConfigSnapshotsFile | null,
  localConfig: ConfigSignals
): ConfigSnapshotsFile {
  const machineId = getMachineId();
  const data: ConfigSnapshotsFile = existing ?? { version: "1.0.0", snapshots: {} };
  data.version = "1.0.0";

  // Upsert local snapshot
  data.snapshots[machineId] = {
    timestamp: new Date().toISOString(),
    signals: toSyncable(localConfig),
  };

  // Prune stale
  const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  for (const [id, snapshot] of Object.entries(data.snapshots)) {
    const ts = new Date(snapshot.timestamp).getTime();
    if (isNaN(ts) || ts < cutoff) {
      delete data.snapshots[id];
    }
  }

  return data;
}

/**
 * Parse a ConfigSnapshotsFile from JSON string. Returns null if invalid.
 */
export function parseSnapshotsFile(json: string): ConfigSnapshotsFile | null {
  try {
    const data = JSON.parse(json);
    if (data?.version !== "1.0.0" || !data.snapshots) return null;
    return data as ConfigSnapshotsFile;
  } catch {
    return null;
  }
}

// ── Network Functions ──

/**
 * Download remote config snapshots from gist, excluding current machine
 * and stale entries. Returns [] on any failure.
 */
export function downloadRemoteSnapshots(gistId: string): ConfigSnapshot[] {
  try {
    const json = readGistFile(gistId, "config-snapshots.json");
    if (!json) return [];

    const data = parseSnapshotsFile(json);
    if (!data) {
      logError("config-sync: invalid config-snapshots.json format");
      return [];
    }

    const machineId = getMachineId();
    const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;

    return Object.entries(data.snapshots)
      .filter(([id, s]) => {
        if (id === machineId) return false;
        const ts = new Date(s.timestamp).getTime();
        return !isNaN(ts) && ts >= cutoff;
      })
      .map(([, s]) => s);
  } catch (err) {
    logError(`config-sync: failed to download snapshots: ${err}`);
    return [];
  }
}

/**
 * Download remote snapshots and merge with local config.
 * Returns original local config on any failure.
 */
export function mergeRemoteConfig(local: ConfigSignals, gistId: string): ConfigSignals {
  try {
    const snapshots = downloadRemoteSnapshots(gistId);
    return mergeConfigSignals(local, snapshots);
  } catch (err) {
    logError(`config-sync: merge failed: ${err}`);
    return local;
  }
}
