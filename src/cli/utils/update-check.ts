import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { get } from "node:https";
import { ensureStoreDir } from "../../store/queue.js";

const STORE_DIR = join(homedir(), ".cc-proficiency");
const CACHE_FILE = join(STORE_DIR, "version-check.json");
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 3000; // 3 seconds

interface VersionCache {
  latestVersion: string;
  checkedAt: string;
}

function loadCache(): VersionCache | null {
  if (!existsSync(CACHE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function saveCache(cache: VersionCache): void {
  ensureStoreDir();
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf-8");
  } catch {
    // non-critical
  }
}

export function compareVersions(a: string, b: string): number {
  // Strip prerelease/build metadata, compare major.minor.patch only
  const pa = a.split("-")[0]!.split(".").map(Number);
  const pb = b.split("-")[0]!.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] ?? 0;
    const vb = pb[i] ?? 0;
    if (isNaN(va) || isNaN(vb)) return 0; // can't compare, skip
    if (va !== vb) return va - vb;
  }
  return 0;
}

export function fetchLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const done = (val: string | null): void => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(val);
    };

    const timer = setTimeout(() => {
      req.destroy();
      done(null);
    }, FETCH_TIMEOUT_MS);

    const req = get("https://registry.npmjs.org/cc-proficiency/latest", {
      headers: { "Accept": "application/json" },
      timeout: FETCH_TIMEOUT_MS,
    }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        done(null);
        return;
      }
      let data = "";
      res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      res.on("end", () => {
        try {
          const pkg = JSON.parse(data);
          done(typeof pkg.version === "string" ? pkg.version : null);
        } catch {
          done(null);
        }
      });
    });

    req.on("error", () => done(null));
    req.on("timeout", () => { req.destroy(); done(null); });
  });
}

/**
 * Check for updates and print a notice if a newer version is available.
 * Non-blocking: fetches in background, resolves quickly from cache.
 * Call after CLI output is complete.
 */
export async function checkForUpdates(currentVersion: string): Promise<void> {
  // Skip in non-interactive contexts
  if (process.env.CC_PROFICIENCY_NO_UPDATE_CHECK === "1") return;
  if (process.env.CI) return;
  if (!process.stdout.isTTY) return;

  const cache = loadCache();

  // Use cache if fresh
  if (cache) {
    const age = Date.now() - new Date(cache.checkedAt).getTime();
    if (age >= 0 && age < CHECK_INTERVAL_MS) {
      if (compareVersions(cache.latestVersion, currentVersion) > 0) {
        printNotice(currentVersion, cache.latestVersion);
      }
      return;
    }
  }

  // Fetch in background — don't block
  const latest = await fetchLatestVersion();
  if (!latest) return;

  saveCache({ latestVersion: latest, checkedAt: new Date().toISOString() });

  if (compareVersions(latest, currentVersion) > 0) {
    printNotice(currentVersion, latest);
  }
}

function printNotice(current: string, latest: string): void {
  console.log(`\n  Update available: v${current} \u2192 v${latest}`);
  console.log("  Run: cc-proficiency update\n");
}
