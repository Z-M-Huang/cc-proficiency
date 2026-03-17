import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isCIEnvironment } from "../../src/utils/ci-detect.js";

describe("isCIEnvironment", () => {
  const savedEnv: Record<string, string | undefined> = {};
  const CI_VARS = ["CI", "GITHUB_ACTIONS", "GITLAB_CI", "CODESPACES", "BUILDKITE", "CIRCLECI", "TRAVIS", "JENKINS_URL"];

  beforeEach(() => {
    // Save all CI vars
    for (const v of CI_VARS) {
      savedEnv[v] = process.env[v];
      delete process.env[v];
    }
  });

  afterEach(() => {
    // Restore
    for (const v of CI_VARS) {
      if (savedEnv[v] !== undefined) {
        process.env[v] = savedEnv[v];
      } else {
        delete process.env[v];
      }
    }
  });

  it("returns false when no CI vars are set", () => {
    expect(isCIEnvironment()).toBe(false);
  });

  it("detects CI=true", () => {
    process.env.CI = "true";
    expect(isCIEnvironment()).toBe(true);
  });

  it("detects GITHUB_ACTIONS=true", () => {
    process.env.GITHUB_ACTIONS = "true";
    expect(isCIEnvironment()).toBe(true);
  });

  it("detects GITLAB_CI=true", () => {
    process.env.GITLAB_CI = "true";
    expect(isCIEnvironment()).toBe(true);
  });

  it("detects CODESPACES=true", () => {
    process.env.CODESPACES = "true";
    expect(isCIEnvironment()).toBe(true);
  });

  it("detects JENKINS_URL", () => {
    process.env.JENKINS_URL = "http://jenkins.local";
    expect(isCIEnvironment()).toBe(true);
  });

  it("detects BUILDKITE=true", () => {
    process.env.BUILDKITE = "true";
    expect(isCIEnvironment()).toBe(true);
  });

  it("detects CIRCLECI=true", () => {
    process.env.CIRCLECI = "true";
    expect(isCIEnvironment()).toBe(true);
  });

  it("detects TRAVIS=true", () => {
    process.env.TRAVIS = "true";
    expect(isCIEnvironment()).toBe(true);
  });

  it("does not detect CI=false", () => {
    process.env.CI = "false";
    expect(isCIEnvironment()).toBe(false);
  });
});
