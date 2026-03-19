import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CLAUDE_DIR = join(homedir(), ".claude");

export function injectHook(): void {
  const settingsPath = join(CLAUDE_DIR, "settings.json");
  let settings: Record<string, unknown> = {};

  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      console.log("  \u26A0 Could not parse settings.json, creating new hooks section");
    }
  }

  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const stopHooks = (hooks.Stop ?? []) as Array<{ hooks?: Array<{ command?: string }> }>;

  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  let changed = false;

  // Session-end hook (queue + process)
  const sessionEndInstalled = stopHooks.some((group) =>
    group.hooks?.some((h) => h.command?.includes("session-end"))
  );
  if (!sessionEndInstalled) {
    const hookScript = join(__dirname, "..", "..", "hooks", "session-end.js");
    stopHooks.push({
      hooks: [
        {
          type: "command" as const,
          command: `node "${hookScript}"`,
          timeout: 5,
        } as Record<string, unknown>,
      ],
    } as Record<string, unknown>);
    changed = true;
  }

  // Token refresh hook (staleness check + re-render)
  const refreshInstalled = stopHooks.some((group) =>
    group.hooks?.some((h) => h.command?.includes("token-refresh"))
  );
  if (!refreshInstalled) {
    const refreshScript = join(__dirname, "..", "..", "hooks", "token-refresh.js");
    stopHooks.push({
      hooks: [
        {
          type: "command" as const,
          command: `node "${refreshScript}"`,
          timeout: 5,
        } as Record<string, unknown>,
      ],
    } as Record<string, unknown>);
    changed = true;
  }

  if (!changed) {
    console.log("  Hook already installed (skipping)");
    return;
  }

  hooks.Stop = stopHooks;
  settings.hooks = hooks;

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

export function removeHook(): void {
  const settingsPath = join(CLAUDE_DIR, "settings.json");
  if (!existsSync(settingsPath)) return;

  try {
    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    if (settings.hooks?.Stop) {
      settings.hooks.Stop = (settings.hooks.Stop as Array<{ hooks?: Array<{ command?: string }> }>).filter((group) =>
        !group.hooks?.some((h) => h.command?.includes("cc-proficiency") || h.command?.includes("token-refresh"))
      );
      if (settings.hooks.Stop.length === 0) {
        delete settings.hooks.Stop;
      }
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks;
      }
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
      console.log("  \u2713 Hook removed from settings.json");
    }
  } catch {
    console.log("  \u26A0 Could not update settings.json");
  }
}
