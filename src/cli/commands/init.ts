import { renderBadge } from "../../renderer/svg.js";
import { loadStore, loadConfig, saveConfig, saveBadge, getBadgePath, getStoreDir, computeTokenWindows } from "../../store/local-store.js";
import { ensureStoreDir } from "../../store/queue.js";
import { isGhAuthenticated, getGhUsername, createGist, updateGist, getGistRawUrl } from "../../gist/uploader.js";
import { detectLocale } from "../../i18n/locales.js";
import { injectHook } from "../services/hooks.js";
import { getConfigLocale } from "../utils/locale.js";
import { cmdAnalyze } from "./analyze.js";

export async function cmdInit(): Promise<void> {
  console.log("Initializing cc-proficiency...\n");
  ensureStoreDir();

  const config = loadConfig();

  if (isGhAuthenticated()) {
    const username = getGhUsername();
    if (username) {
      config.username = username;
      console.log(`  GitHub user: @${username}`);
    }
  } else {
    console.log("  \u26A0 GitHub CLI not authenticated.");
    console.log("  Badge will be saved locally to: " + getBadgePath());
    console.log("  To enable auto-upload: gh auth login && cc-proficiency init\n");
  }

  // Auto-detect locale from environment (LANG/LC_ALL)
  if (!config.locale) {
    config.locale = detectLocale();
    console.log(`  Locale: ${config.locale}`);
  }

  injectHook();
  console.log("  \u2713 Hook injected into ~/.claude/settings.json");

  console.log("\n  Running initial analysis...");
  saveConfig(config);
  await cmdAnalyze(["--full"]);

  const store = loadStore();
  let badgeSvg = '<svg xmlns="http://www.w3.org/2000/svg"><text>No data</text></svg>';
  if (store.lastResult) {
    badgeSvg = renderBadge(store.lastResult, getConfigLocale(), computeTokenWindows(store.tokenLog));
    saveBadge(badgeSvg);
  }

  if (config.username && isGhAuthenticated() && !config.gistId) {
    console.log("  Creating private Gist with badge...");
    const result = createGist(badgeSvg, config.public);
    if (result.success && result.url) {
      config.gistId = result.url;
      const rawUrl = getGistRawUrl(config.username, result.url);
      console.log(`  \u2713 Gist created`);
      console.log(`\n  Add to your README:`);
      console.log(`  ![CC Proficiency](${rawUrl})`);
    } else {
      console.log(`  \u26A0 Could not create Gist: ${result.error}`);
    }
  } else if (config.gistId && isGhAuthenticated()) {
    const gistResult = updateGist(config.gistId, badgeSvg);
    if (gistResult.success) {
      const rawUrl = getGistRawUrl(config.username ?? "", config.gistId);
      console.log(`  \u2713 Badge pushed to Gist: ${rawUrl}`);
    }
  }

  saveConfig(config);
  console.log("\n  \u2713 Configuration saved to " + getStoreDir());
  console.log("  Badge saved locally to: " + getBadgePath());
}
