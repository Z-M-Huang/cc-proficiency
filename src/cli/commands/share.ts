import { isGhAuthenticated, createPublicGist, deleteGist, pushGistFiles } from "../../gist/uploader.js";
import { openJoinIssue, openLeaveIssue } from "../../gist/registry.js";
import { loadStore, loadConfig, saveConfig } from "../../store/local-store.js";
import { buildPublicProfile } from "../../store/public-profile.js";
import { mergeAndPush } from "../services/publishing.js";
import { t } from "../../i18n/index.js";

export function cmdShare(args: string[]): void {
  if (args.includes("--remove")) {
    return doLeave();
  }
  return doJoin();
}

function doJoin(): void {
  const config = loadConfig();
  const store = loadStore();
  const s = t().cli.share;

  // Prerequisites
  if (!isGhAuthenticated()) {
    console.log(t().common.ghNotAuthenticated);
    return;
  }
  if (!config.gistId) {
    console.log(t().common.noGistConfigured);
    return;
  }
  if (!store.lastResult) {
    console.log(t().common.noAnalysisData);
    return;
  }

  // Idempotent check
  if (config.leaderboard && config.publicGistId) {
    console.log(s.alreadyOnLeaderboard);
    return;
  }

  // Privacy notice
  console.log(s.joining + "\n");
  console.log(s.sharingPublicly);
  console.log(s.sharedItems + "\n");
  console.log(s.notShared + "\n");

  // Ensure fresh data via mergeAndPush
  const pushResult = mergeAndPush(
    store,
    store.lastResult,
    config.gistId,
    config.username ?? "unknown",
    false
  );

  if (!pushResult.success) {
    console.log(s.syncFailed(pushResult.error ?? "unknown"));
    return;
  }

  // Build public profile from merged data
  if (!pushResult.merged) {
    console.log(s.noMergedData);
    return;
  }

  const publicProfile = buildPublicProfile(pushResult.merged);
  const profileJson = JSON.stringify(publicProfile, null, 2);

  // Create or reuse public gist
  let publicGistId = config.publicGistId;
  let newlyCreated = false;

  if (!publicGistId) {
    console.log(s.creatingPublicGist);
    const gistResult = createPublicGist(profileJson);
    if (!gistResult.success || !gistResult.url) {
      console.log(s.publicGistCreateFailed(gistResult.error ?? "unknown"));
      return;
    }
    publicGistId = gistResult.url;
    newlyCreated = true;
    console.log(s.publicGistCreated(publicGistId));
  } else {
    // Update existing public gist
    const updateResult = pushGistFiles(publicGistId, {
      "cc-proficiency-public.json": profileJson,
    });
    if (!updateResult.success) {
      console.log(s.publicGistUpdateFailed(updateResult.error ?? "unknown"));
      return;
    }
    console.log(s.publicGistUpdated(publicGistId));
  }

  // Open registration issue
  console.log(s.registering);
  const issueResult = openJoinIssue(config.username ?? "unknown", publicGistId);

  if (!issueResult.success) {
    // Rollback: delete newly created gist to prevent orphans
    if (newlyCreated) {
      deleteGist(publicGistId);
    }
    console.log(s.registerFailed(issueResult.error ?? "unknown"));
    return;
  }

  // Save config on success only
  config.leaderboard = true;
  config.publicGistId = publicGistId;
  saveConfig(config);

  console.log(s.registrationCreated);
  console.log(`    ${issueResult.issueUrl}`);
  console.log(`\n${s.profileWillAppear}`);
}

function doLeave(): void {
  const config = loadConfig();
  const s = t().cli.share;

  if (!isGhAuthenticated()) {
    console.log(t().common.ghNotAuthenticated);
    return;
  }

  console.log(s.leaving + "\n");

  // Open removal issue FIRST — don't delete gist until issue is confirmed
  const issueResult = openLeaveIssue(config.username ?? "unknown");
  if (!issueResult.success) {
    console.log(s.registerFailed(issueResult.error ?? "unknown"));
    console.log(s.unchangedNotice);
    return;
  }
  console.log(s.removalCreated(issueResult.issueUrl ?? ""));

  // Only delete gist + clear config after issue is confirmed
  if (config.publicGistId) {
    const delResult = deleteGist(config.publicGistId);
    if (delResult.success) {
      console.log(s.publicGistDeleted);
    } else {
      console.log(s.publicGistDeleteFailed(delResult.error ?? "unknown"));
    }
  }

  config.leaderboard = false;
  config.publicGistId = undefined;
  saveConfig(config);

  console.log(`\n${s.removedFromLeaderboard}`);
}
