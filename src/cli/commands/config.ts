import { loadConfig, saveConfig } from "../../store/local-store.js";
import { t, isValidLocale, SUPPORTED_LOCALES } from "../../i18n/index.js";

export function cmdConfig(args: string[]): void {
  const config = loadConfig();

  if (args.length === 0) {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (args.length === 1) {
    const key = args[0] as keyof typeof config;
    if (key in config) {
      console.log(`${key}: ${JSON.stringify(config[key])}`);
    } else {
      console.log(t().common.unknownKey(key));
    }
    return;
  }

  const [key, value] = args;
  if (key === "locale" && !isValidLocale(value)) {
    console.log(t().common.invalidLocale(value!, SUPPORTED_LOCALES.join(", ")));
    return;
  }
  if (key === "username") config.username = value;
  else if (key === "gistId") config.gistId = value;
  else if (key === "autoUpload") config.autoUpload = value === "true";
  else if (key === "public") config.public = value === "true";
  else if (key === "locale") config.locale = value;
  else if (key === "leaderboard") config.leaderboard = value === "true";
  else if (key === "publicGistId") config.publicGistId = value;
  else {
    console.log(t().common.unknownKey(key!));
    return;
  }

  saveConfig(config);
  console.log(t().cli.config.setValue(key!, value!));
}
