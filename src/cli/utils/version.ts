import { readFileSync } from "node:fs";
import { join } from "node:path";

export function getVersion(): string {
  try {
    // dist/cli/utils/version.js -> ../../../package.json
    const pkg = JSON.parse(readFileSync(join(__dirname, "..", "..", "..", "package.json"), "utf-8"));
    return pkg.version ?? "0.1.0";
  } catch {
    return "0.1.0";
  }
}
