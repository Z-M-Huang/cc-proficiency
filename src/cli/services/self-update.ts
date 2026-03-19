import { execFileSync } from "node:child_process";
import { fetchLatestVersion, compareVersions } from "../utils/update-check.js";

export interface UpdateCheckResult {
  available: boolean;
  current: string;
  latest: string;
  fetchFailed?: boolean;
}

export interface InstallResult {
  success: boolean;
  error?: string;
}

export function getNpmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult> {
  const latest = await fetchLatestVersion();
  if (!latest) {
    return { available: false, current: currentVersion, latest: currentVersion, fetchFailed: true };
  }
  const available = compareVersions(latest, currentVersion) > 0;
  return { available, current: currentVersion, latest };
}

export function runNpmInstall(version: string): InstallResult {
  try {
    // Use pipe for stderr to reliably detect permission errors
    execFileSync(getNpmCommand(), ["install", "-g", `cc-proficiency@${version}`], {
      stdio: ["inherit", "inherit", "pipe"],
      timeout: 120_000,
    });
    return { success: true };
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException & { status?: number; stderr?: Buffer };

    if (error.code === "ENOENT") {
      return { success: false, error: "not-found" };
    }

    const stderr = error.stderr?.toString() ?? "";
    const msg = stderr || error.message || "";
    if (msg.includes("EACCES") || msg.includes("EPERM") || msg.includes("permission denied")) {
      if (stderr) process.stderr.write(stderr);
      return { success: false, error: "permission" };
    }

    if (stderr) process.stderr.write(stderr);
    return { success: false, error: error.message || `npm exited with code ${error.status}` };
  }
}
