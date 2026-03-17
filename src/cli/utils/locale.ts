import { loadConfig } from "../../store/local-store.js";
import { detectLocale, type Locale } from "../../i18n/locales.js";

export function getConfigLocale(): Locale {
  const config = loadConfig();
  if (config.locale === "zh-CN") return "zh-CN";
  if (config.locale === "en") return "en";
  return detectLocale();
}
