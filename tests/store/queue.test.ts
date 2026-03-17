import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const TEST_HOME = join(tmpdir(), "cc-prof-test-queue-" + process.pid);

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: () => join(actual.tmpdir(), "cc-prof-test-queue-" + process.pid),
  };
});

import { enqueue, readQueue, writeQueue, acquireLock, releaseLock, ensureStoreDir } from "../../src/store/queue.js";
import type { QueueEntry } from "../../src/types.js";

const STORE_DIR = join(TEST_HOME, ".cc-proficiency");

beforeEach(() => {
  mkdirSync(TEST_HOME, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_HOME, { recursive: true, force: true });
});

describe("ensureStoreDir", () => {
  it("creates store directory if missing", () => {
    ensureStoreDir();
    expect(existsSync(STORE_DIR)).toBe(true);
  });
});

describe("enqueue / readQueue", () => {
  it("appends and reads entries", () => {
    enqueue({ sessionId: "s1", transcriptPath: "/a", cwd: "/b", timestamp: "t1" });
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.sessionId).toBe("s1");
  });

  it("appends multiple entries", () => {
    enqueue({ sessionId: "s1", transcriptPath: "/a", cwd: "/b", timestamp: "t1" });
    enqueue({ sessionId: "s2", transcriptPath: "/c", cwd: "/d", timestamp: "t2" });
    expect(readQueue()).toHaveLength(2);
  });

  it("returns empty when no file", () => {
    expect(readQueue()).toEqual([]);
  });
});

describe("writeQueue", () => {
  it("removes processed entries atomically", () => {
    enqueue({ sessionId: "s1", transcriptPath: "/a", cwd: "/b", timestamp: "t1" });
    enqueue({ sessionId: "s2", transcriptPath: "/c", cwd: "/d", timestamp: "t2" });
    writeQueue(new Set(["s1"])); // mark s1 as processed
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0]!.sessionId).toBe("s2");
  });
});

describe("acquireLock / releaseLock", () => {
  it("acquires when none exists", () => {
    expect(acquireLock()).toBe(true);
    releaseLock();
  });

  it("fails when fresh lock held", () => {
    expect(acquireLock()).toBe(true);
    expect(acquireLock()).toBe(false);
    releaseLock();
  });

  it("breaks stale lock", () => {
    ensureStoreDir();
    writeFileSync(join(STORE_DIR, "queue.lock"), String(Date.now() - 120_000));
    expect(acquireLock()).toBe(true);
    releaseLock();
  });

  it("releaseLock is safe when no lock", () => {
    releaseLock();
  });
});
