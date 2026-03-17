import { loadConfig, saveConfig } from "../../store/local-store.js";

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
      console.log(`Unknown key: ${key}`);
    }
    return;
  }

  const [key, value] = args;
  if (key === "username") config.username = value;
  else if (key === "gistId") config.gistId = value;
  else if (key === "autoUpload") config.autoUpload = value === "true";
  else if (key === "public") config.public = value === "true";
  else if (key === "locale") config.locale = value;
  else {
    console.log(`Unknown key: ${key}`);
    return;
  }

  saveConfig(config);
  console.log(`Set ${key} = ${value}`);
}
