import { getVersion } from "../utils/version.js";
import { checkForUpdate, runNpmInstall } from "../services/self-update.js";

export async function cmdUpdate(): Promise<void> {
  console.log("Checking for updates...");
  const check = await checkForUpdate(getVersion());

  if (check.fetchFailed) {
    console.log("Could not reach the npm registry. Check your internet connection.");
    return;
  }

  if (!check.available) {
    console.log(`Already on the latest version (v${check.current}).`);
    return;
  }

  console.log(`Update available: v${check.current} \u2192 v${check.latest}\n`);
  console.log("Updating cc-proficiency...");

  const result = runNpmInstall(check.latest);

  if (result.success) {
    console.log(`\u2713 Updated to v${check.latest}`);
  } else if (result.error === "permission") {
    console.log("\u2717 Permission denied.");
    if (process.platform === "win32") {
      console.log("Run this command in an Administrator terminal.");
    } else {
      console.log(`Run: sudo npm install -g cc-proficiency@${check.latest}`);
    }
  } else if (result.error === "not-found") {
    console.log("\u2717 npm not found. Install Node.js/npm first.");
  } else {
    console.log(`\u2717 Update failed: ${result.error}`);
    console.log(`Try manually: npm install -g cc-proficiency@${check.latest}`);
  }
}
