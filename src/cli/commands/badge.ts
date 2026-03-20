import { writeFileSync } from "node:fs";
import { renderBadge } from "../../renderer/svg.js";
import { renderAnimatedBadge } from "../../renderer/animated-svg.js";
import { loadStore, saveBadge, saveAnimatedBadge, computeTokenWindows } from "../../store/local-store.js";
import { t } from "../../i18n/index.js";

export function cmdBadge(args: string[]): void {
  const store = loadStore();
  if (!store.lastResult) {
    console.log(t().common.noAnalysisData);
    return;
  }

  const animated = args.includes("--animated");
  const tokenWindows = computeTokenWindows(store.tokenLog);
  const svg = animated
    ? renderAnimatedBadge(store.lastResult, tokenWindows)
    : renderBadge(store.lastResult, tokenWindows);

  const outputIdx = args.indexOf("--output");
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    writeFileSync(args[outputIdx + 1]!, svg, "utf-8");
    console.log(t().cli.badge.writtenTo(args[outputIdx + 1]!));
  } else {
    const path = animated ? saveAnimatedBadge(svg) : saveBadge(svg);
    console.log(t().cli.badge.savedTo(path));
  }
}
