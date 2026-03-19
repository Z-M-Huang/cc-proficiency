import { writeFileSync } from "node:fs";
import { renderBadge } from "../../renderer/svg.js";
import { renderAnimatedBadge } from "../../renderer/animated-svg.js";
import { loadStore, saveBadge, saveAnimatedBadge } from "../../store/local-store.js";
import { getConfigLocale } from "../utils/locale.js";

export function cmdBadge(args: string[]): void {
  const store = loadStore();
  if (!store.lastResult) {
    console.log("No analysis data. Run 'cc-proficiency analyze' first.");
    return;
  }

  const animated = args.includes("--animated");
  const locale = getConfigLocale();
  const svg = animated
    ? renderAnimatedBadge(store.lastResult, locale)
    : renderBadge(store.lastResult, locale);

  const outputIdx = args.indexOf("--output");
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    writeFileSync(args[outputIdx + 1]!, svg, "utf-8");
    console.log(`Badge written to ${args[outputIdx + 1]}`);
  } else {
    const path = animated ? saveAnimatedBadge(svg) : saveBadge(svg);
    console.log(`Badge saved to ${path}`);
  }
}
