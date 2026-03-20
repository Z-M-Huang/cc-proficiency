import { getVersion } from "../utils/version.js";
import { checkForUpdate, runNpmInstall } from "../services/self-update.js";
import { t } from "../../i18n/index.js";

export async function cmdUpdate(): Promise<void> {
  const s = t().cli.update;
  console.log(s.checking);
  const check = await checkForUpdate(getVersion());

  if (check.fetchFailed) {
    console.log(s.fetchFailed);
    return;
  }

  if (!check.available) {
    console.log(s.alreadyLatest(check.current));
    return;
  }

  console.log(s.available(check.current, check.latest) + "\n");
  console.log(s.updating);

  const result = runNpmInstall(check.latest);

  if (result.success) {
    console.log(s.updated(check.latest));
  } else if (result.error === "permission") {
    console.log(s.permissionDenied);
    if (process.platform === "win32") {
      console.log(s.runAsAdmin);
    } else {
      console.log(s.runSudo(check.latest));
    }
  } else if (result.error === "not-found") {
    console.log(s.npmNotFound);
  } else {
    console.log(s.failed(result.error ?? "unknown"));
    console.log(s.tryManually(check.latest));
  }
}
