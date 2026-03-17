import { loadStore, saveStore, loadConfig } from "../../store/local-store.js";
import { gatherData, runAnalysis } from "../services/sessions.js";
import { printResult } from "../utils/formatting.js";

export async function cmdAnalyze(args: string[]): Promise<void> {
  const full = args.includes("--full");
  console.log(full ? "Running full analysis..." : "Running incremental analysis...\n");

  const { sessions, config } = await gatherData(full);

  if (sessions.length === 0) {
    console.log("No sessions found. Use Claude Code first, then run analyze again.");
    return;
  }

  const userConfig = loadConfig();
  const result = runAnalysis(sessions, config, userConfig.username ?? "unknown");

  const store = loadStore();
  store.lastResult = result;
  for (const s of sessions) {
    if (!store.processedSessionIds.includes(s.sessionId)) {
      store.processedSessionIds.push(s.sessionId);
    }
  }
  saveStore(store);

  printResult(result);
}
