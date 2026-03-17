import { existsSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { getStoreDir } from "../../store/local-store.js";
import { removeHook } from "../services/hooks.js";

export function cmdUninstall(): void {
  console.log("Uninstalling cc-proficiency...\n");

  removeHook();

  const storeDir = getStoreDir();
  if (existsSync(storeDir)) {
    try {
      const files = readdirSync(storeDir);
      for (const f of files) {
        unlinkSync(join(storeDir, f));
      }
      rmdirSync(storeDir);
      console.log("  \u2713 Local data removed");
    } catch {
      console.log("  \u26A0 Could not fully remove " + storeDir);
    }
  }

  console.log("\n  cc-proficiency uninstalled. Run 'npm uninstall -g cc-proficiency' to remove the package.");
}
