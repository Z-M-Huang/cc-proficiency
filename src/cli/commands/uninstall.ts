import { existsSync, readdirSync, unlinkSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { getStoreDir } from "../../store/local-store.js";
import { removeHook } from "../services/hooks.js";
import { t } from "../../i18n/index.js";

export function cmdUninstall(): void {
  const s = t().cli.uninstall;
  console.log(s.uninstalling + "\n");

  removeHook();

  const storeDir = getStoreDir();
  if (existsSync(storeDir)) {
    try {
      const files = readdirSync(storeDir);
      for (const f of files) {
        unlinkSync(join(storeDir, f));
      }
      rmdirSync(storeDir);
      console.log(s.localDataRemoved);
    } catch {
      console.log(s.couldNotRemove(storeDir));
    }
  }

  console.log("\n" + s.npmUninstallHint);
}
