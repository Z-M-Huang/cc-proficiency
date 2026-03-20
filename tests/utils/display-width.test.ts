import { describe, it, expect } from "vitest";
import { displayWidth, padEndDisplay } from "../../src/utils/display-width.js";

describe("displayWidth", () => {
  it("counts ASCII characters as width 1", () => {
    expect(displayWidth("hello")).toBe(5);
    expect(displayWidth("CC Mastery")).toBe(10);
  });

  it("counts CJK characters as width 2", () => {
    expect(displayWidth("你好")).toBe(4);
    expect(displayWidth("CC 掌握")).toBe(7); // 2 ASCII + 1 space + 2*2 CJK
  });

  it("handles mixed ASCII and CJK", () => {
    expect(displayWidth("Hello世界")).toBe(9); // 5 ASCII + 2*2 CJK
  });

  it("counts Japanese katakana as width 2", () => {
    expect(displayWidth("エージェント")).toBe(12); // 6 chars * 2
  });

  it("counts Korean hangul as width 2", () => {
    expect(displayWidth("에이전트")).toBe(8); // 4 chars * 2
  });

  it("handles empty string", () => {
    expect(displayWidth("")).toBe(0);
  });
});

describe("padEndDisplay", () => {
  it("pads ASCII correctly", () => {
    expect(padEndDisplay("hi", 10)).toBe("hi        ");
    expect(padEndDisplay("hi", 10).length).toBe(10);
  });

  it("pads CJK-aware", () => {
    const padded = padEndDisplay("你好", 10);
    // "你好" has display width 4, needs 6 more spaces
    expect(padded).toBe("你好      ");
    expect(displayWidth(padded)).toBe(10);
  });

  it("does not pad if already at target width", () => {
    expect(padEndDisplay("hello", 5)).toBe("hello");
  });

  it("does not pad if exceeds target width", () => {
    expect(padEndDisplay("hello world", 5)).toBe("hello world");
  });
});
