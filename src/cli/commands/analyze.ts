import { loadStore, saveStore, loadConfig, upsertTokenLog, computeTokenWindows } from "../../store/local-store.js";
import { gatherData, runAnalysis } from "../services/sessions.js";
import { printResult } from "../utils/formatting.js";

export async function cmdAnalyze(args: string[]): Promise<void> {
  const full = args.includes("--full");
  console.log(full ? "Running full analysis..." : "Running incremental analysis...\n");

  const { sessions, config } = await gatherData(full);

  // Always persist current cwd, even if no sessions found
  const store = loadStore();
  const known = new Set(store.knownProjectCwds ?? []);
  known.add(process.cwd());
  store.knownProjectCwds = [...known];
  saveStore(store);

  if (sessions.length === 0) {
    console.log("No sessions found. Use Claude Code first, then run analyze again.");
    return;
  }

  const userConfig = loadConfig();
  const result = runAnalysis(sessions, config, userConfig.username ?? "unknown");

  // Build token log entries from parsed sessions
  upsertTokenLog(store, sessions.map((s) => ({
    sessionId: s.sessionId,
    timestamp: s.endTime,
    tokens: s.totalTokens,
  })));

  store.lastResult = result;
  for (const s of sessions) {
    if (!store.processedSessionIds.includes(s.sessionId)) {
      store.processedSessionIds.push(s.sessionId);
    }
  }
  saveStore(store);

  const tokenWindows = computeTokenWindows(store.tokenLog);
  printResult(result, tokenWindows);
}
