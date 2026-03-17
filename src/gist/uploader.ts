import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export interface GistResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Check if gh CLI is installed and authenticated.
 */
export function isGhAuthenticated(): boolean {
  try {
    execFileSync("gh", ["auth", "status"], { stdio: "pipe", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get GitHub username from gh CLI.
 */
export function getGhUsername(): string | undefined {
  try {
    const result = execFileSync("gh", ["api", "user", "--jq", ".login"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10_000,
    });
    return result.trim() || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Create a new Gist with the SVG badge.
 */
export function createGist(svgContent: string, isPublic: boolean): GistResult {
  const tmpFile = join(tmpdir(), "cc-proficiency.svg");
  try {
    writeFileSync(tmpFile, svgContent, "utf-8");
    const args = ["gist", "create", "-d", "Claude Code Proficiency Badge", tmpFile];
    if (isPublic) args.splice(2, 0, "--public");
    const result = execFileSync("gh", args, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });
    const url = result.trim();
    const gistId = url.split("/").pop();
    return { success: true, url: gistId };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Update an existing Gist with new SVG content.
 */
export function updateGist(gistId: string, svgContent: string, filename: string = "cc-proficiency.svg"): GistResult {
  const tmpFile = join(tmpdir(), filename);
  try {
    writeFileSync(tmpFile, svgContent, "utf-8");
    execFileSync("gh", ["gist", "edit", gistId, "-a", tmpFile], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/**
 * Read a file from an existing Gist.
 */
export function readGistFile(gistId: string, filename: string): string | null {
  try {
    const result = execFileSync("gh", [
      "api", `gists/${gistId}`,
      "--jq", `.files["${filename}"].content`,
    ], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 15_000,
    });
    return result.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Find an existing cc-proficiency Gist for the current user.
 */
export function findExistingGist(): string | null {
  try {
    const result = execFileSync("gh", [
      "api", "gists", "--paginate",
      "--jq", '.[] | select(.files["cc-proficiency.json"]) | .id',
    ], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });
    const ids = result.trim().split("\n").filter(Boolean);
    return ids[0] ?? null; // most recent
  } catch {
    return null;
  }
}

/**
 * Push multiple files to a Gist atomically via gh api PATCH.
 */
export function pushGistFiles(gistId: string, files: Record<string, string>): GistResult {
  try {
    const payload: Record<string, unknown> = { files: {} };
    for (const [name, content] of Object.entries(files)) {
      (payload.files as Record<string, unknown>)[name] = { content };
    }
    const tmpFile = join(tmpdir(), "cc-proficiency-patch.json");
    writeFileSync(tmpFile, JSON.stringify(payload), "utf-8");
    try {
      execFileSync("gh", ["api", "-X", "PATCH", `gists/${gistId}`, "--input", tmpFile], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 30_000,
      });
      return { success: true };
    } finally {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Get the raw URL for a gist file.
 */
export function getGistRawUrl(username: string, gistId: string, filename: string = "cc-proficiency.svg"): string {
  return `https://gist.githubusercontent.com/${username}/${gistId}/raw/${filename}`;
}
