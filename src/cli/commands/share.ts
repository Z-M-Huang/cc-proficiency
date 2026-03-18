import { isGhAuthenticated, createPublicGist, deleteGist, pushGistFiles } from "../../gist/uploader.js";
import { openJoinIssue, openLeaveIssue } from "../../gist/registry.js";
import { loadStore, loadConfig, saveConfig } from "../../store/local-store.js";
import { buildPublicProfile } from "../../store/public-profile.js";
import { mergeAndPush } from "../services/publishing.js";

export function cmdShare(args: string[]): void {
  if (args.includes("--remove")) {
    return doLeave();
  }
  return doJoin();
}

function doJoin(): void {
  const config = loadConfig();
  const store = loadStore();

  // Prerequisites
  if (!isGhAuthenticated()) {
    console.log("\u26A0 GitHub CLI not authenticated. Run: gh auth login");
    return;
  }
  if (!config.gistId) {
    console.log("No Gist configured. Run: cc-proficiency init");
    return;
  }
  if (!store.lastResult) {
    console.log("No analysis data. Run: cc-proficiency analyze");
    return;
  }

  // Idempotent check
  if (config.leaderboard && config.publicGistId) {
    console.log("Already on the leaderboard. Profile auto-updates on push.");
    return;
  }

  // Privacy notice
  console.log("  Joining the cc-proficiency leaderboard...\n");
  console.log("  This will share publicly:");
  console.log("    - GitHub username, domain scores, streak, achievement count");
  console.log("    - Total sessions and hours, member since date\n");
  console.log("  NOT shared: session details, project names, file paths, tools\n");

  // Ensure fresh data via mergeAndPush
  const pushResult = mergeAndPush(
    store,
    store.lastResult,
    config.gistId,
    config.username ?? "unknown",
    false
  );

  if (!pushResult.success) {
    console.log(`\u2717 Failed to sync data: ${pushResult.error}`);
    return;
  }

  // Build public profile from merged data
  if (!pushResult.merged) {
    console.log("\u2717 Failed to build public profile — no merged data");
    return;
  }

  const publicProfile = buildPublicProfile(pushResult.merged);
  const profileJson = JSON.stringify(publicProfile, null, 2);

  // Create or reuse public gist
  let publicGistId = config.publicGistId;
  let newlyCreated = false;

  if (!publicGistId) {
    console.log("  Creating public profile gist...");
    const gistResult = createPublicGist(profileJson);
    if (!gistResult.success || !gistResult.url) {
      console.log(`\u2717 Failed to create public gist: ${gistResult.error}`);
      return;
    }
    publicGistId = gistResult.url;
    newlyCreated = true;
    console.log(`  \u2713 Public gist created: ${publicGistId}`);
  } else {
    // Update existing public gist
    const updateResult = pushGistFiles(publicGistId, {
      "cc-proficiency-public.json": profileJson,
    });
    if (!updateResult.success) {
      console.log(`\u2717 Failed to update public gist: ${updateResult.error}`);
      return;
    }
    console.log(`  \u2713 Public gist updated: ${publicGistId}`);
  }

  // Open registration issue
  console.log("  Registering on leaderboard...");
  const issueResult = openJoinIssue(config.username ?? "unknown", publicGistId);

  if (!issueResult.success) {
    // Rollback: delete newly created gist to prevent orphans
    if (newlyCreated) {
      deleteGist(publicGistId);
    }
    console.log(`\u2717 Failed to register: ${issueResult.error}`);
    return;
  }

  // Save config on success only
  config.leaderboard = true;
  config.publicGistId = publicGistId;
  saveConfig(config);

  console.log(`  \u2713 Registration issue created`);
  console.log(`    ${issueResult.issueUrl}`);
  console.log("\n  Your profile will appear once the issue is processed.");
}

function doLeave(): void {
  const config = loadConfig();

  if (!isGhAuthenticated()) {
    console.log("\u26A0 GitHub CLI not authenticated. Run: gh auth login");
    return;
  }

  console.log("  Leaving the cc-proficiency leaderboard...\n");

  // Open removal issue FIRST — don't delete gist until issue is confirmed
  const issueResult = openLeaveIssue(config.username ?? "unknown");
  if (!issueResult.success) {
    console.log(`\u2717 Could not create removal issue: ${issueResult.error}`);
    console.log("  Your leaderboard entry and public gist are unchanged.");
    return;
  }
  console.log(`  \u2713 Removal issue created: ${issueResult.issueUrl}`);

  // Only delete gist + clear config after issue is confirmed
  if (config.publicGistId) {
    const delResult = deleteGist(config.publicGistId);
    if (delResult.success) {
      console.log("  \u2713 Public profile gist deleted");
    } else {
      console.log(`  \u26A0 Could not delete public gist: ${delResult.error}`);
    }
  }

  config.leaderboard = false;
  config.publicGistId = undefined;
  saveConfig(config);

  console.log("\n  Removed from leaderboard.");
}
