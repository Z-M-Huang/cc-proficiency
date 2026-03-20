import type { AllStrings, BadgeStrings, Locale } from "./types.js";
import { en } from "./locales/en.js";
import { zhCN } from "./locales/zh-CN.js";
import { es } from "./locales/es.js";
import { fr } from "./locales/fr.js";
import { ja } from "./locales/ja.js";
import { ko } from "./locales/ko.js";

export type { AllStrings, BadgeStrings, Locale };
export type { DomainId, FeatureKey, AchievementItemStrings } from "./types.js";

/** Single registry — drives Locale union, loader, config validation, help text. */
const LOCALES: Record<Locale, AllStrings> = {
  en,
  "zh-CN": zhCN,
  es,
  fr,
  ja,
  ko,
};

export const SUPPORTED_LOCALES = Object.keys(LOCALES) as Locale[];

export function isValidLocale(val: string | undefined): val is Locale {
  return val != null && val in LOCALES;
}

// ── Module-level cache ──

let cached: AllStrings = en;

/** Resolve locale from config/env and cache. Call once in main(). */
export function initLocale(configLocale?: string): void {
  if (isValidLocale(configLocale)) {
    cached = LOCALES[configLocale];
  } else {
    const detected = detectLocale();
    cached = LOCALES[detected];
  }
}

/** Return cached AllStrings for CLI usage. */
export function t(): AllStrings {
  return cached;
}

/** Direct access by locale — used by renderers to build multi-locale entries. */
export function getLocaleStrings(locale: Locale): AllStrings {
  return LOCALES[locale] ?? LOCALES.en;
}

/**
 * Detect locale from environment variables.
 * Priority: LC_ALL → LC_MESSAGES → LANG → LANGUAGE
 */
export function detectLocale(): Locale {
  const raw =
    process.env.LC_ALL ??
    process.env.LC_MESSAGES ??
    process.env.LANG ??
    process.env.LANGUAGE ??
    "";
  const lang = raw.toLowerCase();
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("fr")) return "fr";
  if (lang.startsWith("ja")) return "ja";
  if (lang.startsWith("ko")) return "ko";
  return "en";
}
