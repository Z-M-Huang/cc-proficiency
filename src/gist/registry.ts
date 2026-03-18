import { execFileSync } from "node:child_process";
import { readGistFile } from "./uploader.js";
import { parsePublicProfile } from "../store/public-profile.js";
import type { LeaderboardRegistry, PublicProfile } from "../types.js";

// Must match vars.REGISTRY_GIST_ID in .github/workflows/leaderboard-registration.yml
const REGISTRY_GIST_ID = "ce1b434355768cfa36c68e5dbe5aa982";
const BOARD_REPO = "Z-M-Huang/cc-proficiency";

// Known limitation: public profiles are trust-based. A user could handcraft a gist
// with fake scores. Server-side verification or signed profiles would be needed to
// prevent this. Acceptable for v1 community leaderboard.

/**
 * Read the leaderboard registry from the owner's public gist.
 */
export function readRegistry(): LeaderboardRegistry | null {
  const json = readGistFile(REGISTRY_GIST_ID, "cc-proficiency-registry.json");
  if (!json) return null;
  try {
    const data = JSON.parse(json);
    if (data?.version !== "1.0.0" || !Array.isArray(data.entries)) return null;
    return data as LeaderboardRegistry;
  } catch {
    return null;
  }
}

/**
 * Read a public profile from a user's public gist.
 */
export function readPublicProfileFromGist(publicGistId: string): PublicProfile | null {
  const json = readGistFile(publicGistId, "cc-proficiency-public.json");
  if (!json) return null;
  return parsePublicProfile(json);
}

/**
 * Open a GitHub Issue to join the leaderboard.
 */
export function openJoinIssue(
  username: string,
  publicGistId: string
): { success: boolean; issueUrl?: string; error?: string } {
  try {
    const title = `[leaderboard] join @${username}`;
    const body = [
      `**Username:** ${username}`,
      `**Public Gist ID:** ${publicGistId}`,
      "",
      "This issue was automatically created by `cc-proficiency share`.",
      "A GitHub Action will validate and add this entry to the leaderboard registry.",
    ].join("\n");

    const result = execFileSync("gh", [
      "issue", "create",
      "--repo", BOARD_REPO,
      "--title", title,
      "--body", body,
      "--label", "leaderboard",
    ], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });
    return { success: true, issueUrl: result.trim() };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Open a GitHub Issue to leave the leaderboard.
 */
export function openLeaveIssue(
  username: string
): { success: boolean; issueUrl?: string; error?: string } {
  try {
    const title = `[leaderboard] leave @${username}`;
    const body = [
      `**Username:** ${username}`,
      "",
      "This issue was automatically created by `cc-proficiency share --remove`.",
      "A GitHub Action will remove this entry from the leaderboard registry.",
    ].join("\n");

    const result = execFileSync("gh", [
      "issue", "create",
      "--repo", BOARD_REPO,
      "--title", title,
      "--body", body,
      "--label", "leaderboard",
    ], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 30_000,
    });
    return { success: true, issueUrl: result.trim() };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
