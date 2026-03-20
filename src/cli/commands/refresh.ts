import { existsSync, statSync } from "node:fs";
import { renderBadge } from "../../renderer/svg.js";
import { renderAnimatedBadge } from "../../renderer/animated-svg.js";
import { loadStore, loadConfig, saveBadge, saveAnimatedBadge, getBadgePath, computeTokenWindows } from "../../store/local-store.js";
import { isGhAuthenticated, readGistFile, pushGistFiles } from "../../gist/uploader.js";
import { computeTokenWindowsFromRemote, parseRemoteStore } from "../../store/remote-store.js";

const STALE_MS = 30 * 60 * 1000; // 30 minutes

function badgeAge(): number {
  const path = getBadgePath();
  if (!existsSync(path)) return Infinity;
  try {
    return Date.now() - statSync(path).mtimeMs;
  } catch {
    return Infinity;
  }
}

/**
 * Refresh token windows and re-render badge.
 * Lightweight — no transcript parsing, just re-compute rolling windows.
 * Skips if badge file was written <30 min ago (unless --force).
 */
export function cmdRefresh(args: string[]): void {
  const force = args.includes("--force");
  const store = loadStore();

  if (!store.lastResult) {
    return; // nothing to refresh — silent exit for hook usage
  }

  // Skip if badge file was recently written (unless forced)
  if (!force && badgeAge() < STALE_MS) {
    return;
  }

  const config = loadConfig();

  // Compute fresh token windows — prefer merged remote data if available,
  // but only if it actually has token entries (avoids zeroing out on legacy gists)
  let tokenWindows = computeTokenWindows(store.tokenLog);
  if (config.gistId && isGhAuthenticated()) {
    const remoteJson = readGistFile(config.gistId, "cc-proficiency.json");
    const remote = remoteJson ? parseRemoteStore(remoteJson) : null;
    if (remote) {
      const remoteWindows = computeTokenWindowsFromRemote(remote.recentSessions);
      if (remoteWindows.tokens24h > 0 || remoteWindows.tokens30d > 0) {
        tokenWindows = remoteWindows;
      }
    }
  }

  // Re-render badges with fresh windows
  const svg = renderBadge(store.lastResult, tokenWindows);
  const animatedSvg = renderAnimatedBadge(store.lastResult, tokenWindows);
  saveBadge(svg);
  saveAnimatedBadge(animatedSvg);

  // Push to gist if configured
  if (config.autoUpload && config.gistId && isGhAuthenticated()) {
    pushGistFiles(config.gistId, {
      "cc-proficiency.svg": svg,
      "cc-proficiency-animated.svg": animatedSvg,
    });
  }
}
