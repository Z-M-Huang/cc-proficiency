import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/cli/utils/update-check.js", () => ({
  fetchLatestVersion: vi.fn(),
  compareVersions: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { checkForUpdate, runNpmInstall, getNpmCommand } from "../../src/cli/services/self-update.js";
import { fetchLatestVersion, compareVersions } from "../../src/cli/utils/update-check.js";
import { execFileSync } from "node:child_process";

beforeEach(() => {
  vi.restoreAllMocks();
});

// ── checkForUpdate ──

describe("checkForUpdate", () => {
  it("returns available: false when current >= latest", async () => {
    vi.mocked(fetchLatestVersion).mockResolvedValue("0.2.7");
    vi.mocked(compareVersions).mockReturnValue(0);
    const result = await checkForUpdate("0.2.7");
    expect(result.available).toBe(false);
    expect(result.current).toBe("0.2.7");
  });

  it("returns available: true when outdated", async () => {
    vi.mocked(fetchLatestVersion).mockResolvedValue("0.3.0");
    vi.mocked(compareVersions).mockReturnValue(1);
    const result = await checkForUpdate("0.2.7");
    expect(result.available).toBe(true);
    expect(result.current).toBe("0.2.7");
    expect(result.latest).toBe("0.3.0");
  });

  it("returns fetchFailed: true when registry unreachable", async () => {
    vi.mocked(fetchLatestVersion).mockResolvedValue(null);
    const result = await checkForUpdate("0.2.7");
    expect(result.available).toBe(false);
    expect(result.fetchFailed).toBe(true);
  });
});

// ── runNpmInstall ──

describe("runNpmInstall", () => {
  it("returns success on zero exit", () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from(""));
    const result = runNpmInstall("0.3.0");
    expect(result.success).toBe(true);
    expect(execFileSync).toHaveBeenCalledWith(
      getNpmCommand(),
      ["install", "-g", "cc-proficiency@0.3.0"],
      expect.objectContaining({ stdio: ["inherit", "inherit", "pipe"] })
    );
  });

  it("returns error: not-found when npm missing", () => {
    const err = new Error("spawn npm ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    vi.mocked(execFileSync).mockImplementation(() => { throw err; });
    const result = runNpmInstall("0.3.0");
    expect(result.success).toBe(false);
    expect(result.error).toBe("not-found");
  });

  it("returns error: permission on EACCES", () => {
    const err = new Error("EACCES: permission denied") as NodeJS.ErrnoException;
    vi.mocked(execFileSync).mockImplementation(() => { throw err; });
    const result = runNpmInstall("0.3.0");
    expect(result.success).toBe(false);
    expect(result.error).toBe("permission");
  });

  it("returns error: permission on EPERM", () => {
    const err = new Error("EPERM: operation not permitted") as NodeJS.ErrnoException;
    vi.mocked(execFileSync).mockImplementation(() => { throw err; });
    const result = runNpmInstall("0.3.0");
    expect(result.success).toBe(false);
    expect(result.error).toBe("permission");
  });

  it("returns error message on other failures", () => {
    const err = new Error("npm ERR! network timeout") as NodeJS.ErrnoException & { status: number };
    err.status = 1;
    vi.mocked(execFileSync).mockImplementation(() => { throw err; });
    const result = runNpmInstall("0.3.0");
    expect(result.success).toBe(false);
    expect(result.error).toContain("network timeout");
  });
});

// ── getNpmCommand ──

describe("getNpmCommand", () => {
  it("returns npm for non-windows", () => {
    // Test environment is Linux
    expect(getNpmCommand()).toBe("npm");
  });
});
