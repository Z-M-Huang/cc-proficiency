import { renderBadge } from "../../renderer/svg.js";
import { renderAnimatedBadge } from "../../renderer/animated-svg.js";
import { loadStore, loadConfig, saveConfig, saveBadge, saveAnimatedBadge, getBadgePath, getStoreDir, computeTokenWindows } from "../../store/local-store.js";
import { ensureStoreDir } from "../../store/queue.js";
import { isGhAuthenticated, getGhUsername, createGist, updateGist, getGistRawUrl } from "../../gist/uploader.js";
import { detectLocale, t } from "../../i18n/index.js";
import { injectHook } from "../services/hooks.js";
import { cmdAnalyze } from "./analyze.js";

export async function cmdInit(): Promise<void> {
  console.log(t().cli.init.initializing + "\n");
  ensureStoreDir();

  const config = loadConfig();

  if (isGhAuthenticated()) {
    const username = getGhUsername();
    if (username) {
      config.username = username;
      console.log(t().cli.init.githubUser(username));
    }
  } else {
    console.log(t().common.ghNotAuthenticated);
    console.log(t().cli.init.badgeSavedLocallyHint(getBadgePath()));
    console.log(t().cli.init.ghEnableHint + "\n");
  }

  // Auto-detect locale from environment (LANG/LC_ALL)
  if (!config.locale) {
    config.locale = detectLocale();
    console.log(t().cli.init.localeDetected(config.locale));
  }

  injectHook();
  console.log(t().cli.init.hookInjected);

  console.log("\n" + t().cli.init.runningInitialAnalysis);
  saveConfig(config);
  await cmdAnalyze(["--full"]);

  const store = loadStore();
  let badgeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><text>No data</text></svg>';
  let animatedSvg = badgeSvg;
  if (store.lastResult) {
    const tokenWindows = computeTokenWindows(store.tokenLog);
    badgeSvg = renderBadge(store.lastResult, tokenWindows);
    animatedSvg = renderAnimatedBadge(store.lastResult, tokenWindows);
    saveBadge(badgeSvg);
    saveAnimatedBadge(animatedSvg);
  }

  if (config.username && isGhAuthenticated() && !config.gistId) {
    console.log(t().cli.init.creatingGist);
    const result = createGist(badgeSvg, config.public);
    if (result.success && result.url) {
      config.gistId = result.url;
      const rawUrl = getGistRawUrl(config.username, result.url);
      console.log(t().cli.init.gistCreated);
      console.log(`\n${t().cli.init.addToReadme}`);
      console.log(`  ![CC Proficiency](${rawUrl})`);
    } else {
      console.log(t().cli.init.gistCreateFailed(result.error ?? "unknown"));
    }
  } else if (config.gistId && isGhAuthenticated()) {
    const gistResult = updateGist(config.gistId, badgeSvg);
    updateGist(config.gistId, animatedSvg, "cc-proficiency-animated.svg");
    if (gistResult.success) {
      const rawUrl = getGistRawUrl(config.username ?? "", config.gistId);
      console.log(t().cli.init.badgePushedToGist(rawUrl));
    }
  }

  saveConfig(config);
  console.log("\n" + t().cli.init.configSaved(getStoreDir()));
  console.log(t().common.badgeSavedLocally(getBadgePath()));
}
