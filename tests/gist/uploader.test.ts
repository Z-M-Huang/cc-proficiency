import { describe, it, expect } from "vitest";
import { getGistRawUrl, isGhAuthenticated } from "../../src/gist/uploader.js";

describe("getGistRawUrl", () => {
  it("constructs correct raw URL", () => {
    const url = getGistRawUrl("testuser", "abc123");
    expect(url).toBe("https://gist.githubusercontent.com/testuser/abc123/raw/cc-proficiency.svg");
  });

  it("uses custom filename", () => {
    const url = getGistRawUrl("user", "gist1", "custom.svg");
    expect(url).toBe("https://gist.githubusercontent.com/user/gist1/raw/custom.svg");
  });

  it("handles empty username", () => {
    const url = getGistRawUrl("", "gist1");
    expect(url).toBe("https://gist.githubusercontent.com//gist1/raw/cc-proficiency.svg");
  });
});

describe("isGhAuthenticated", () => {
  it("returns boolean", () => {
    // gh may or may not be installed in test env
    const result = isGhAuthenticated();
    expect(typeof result).toBe("boolean");
  });
});
