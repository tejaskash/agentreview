import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  addThread,
  replyToThread,
  listThreads,
  getThread,
  resolveThread,
  reopenThread,
} from "agentreview/threads";
import { createSession } from "agentreview/session";
import { createAnchor } from "agentreview/anchors";
import { createTestRepo, cleanupTestRepo } from "./helpers.js";

describe("threads", () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = createTestRepo();
    createSession(repoRoot, {
      baseBranch: "main",
      baseCommit: "abc",
      headBranch: "feature-x",
      headCommit: "def",
    });
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  it("should add a thread with correct defaults", () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    const thread = addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "This doesn't validate the password",
    });

    expect(thread.id).toBe("t-1");
    expect(thread.status).toBe("open");
    expect(thread.severity).toBe("comment");
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0].role).toBe("human");
  });

  it("should assign sequential IDs", () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    addThread(repoRoot, { file: "src/auth.ts", anchor, message: "first" });
    const t2 = addThread(repoRoot, { file: "src/auth.ts", anchor, message: "second" });
    expect(t2.id).toBe("t-2");
  });

  it("should reply to a thread", () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    const thread = addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "Fix this",
    });

    const updated = replyToThread(repoRoot, thread.id, {
      message: "I can add bcrypt",
      role: "agent",
    });

    expect(updated.messages).toHaveLength(2);
    expect(updated.messages[1].role).toBe("agent");
  });

  it("should transition needs-human to open when human replies", () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    const thread = addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "Fix this",
    });

    replyToThread(repoRoot, thread.id, {
      message: "Should I add rate limiting?",
      role: "agent",
      status: "needs-human",
    });

    const updated = replyToThread(repoRoot, thread.id, {
      message: "Yes, add it",
      role: "human",
    });

    expect(updated.status).toBe("open");
  });

  it("should list threads with filters", () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "first",
      severity: "must-fix",
    });
    const t2 = addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "second",
    });
    resolveThread(repoRoot, t2.id);

    const open = listThreads(repoRoot, { status: "open" });
    expect(open).toHaveLength(1);

    const all = listThreads(repoRoot);
    expect(all).toHaveLength(2);
  });

  it("should resolve and reopen threads", () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    const thread = addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "Fix",
    });

    resolveThread(repoRoot, thread.id);
    expect(getThread(repoRoot, thread.id)?.status).toBe("resolved");

    reopenThread(repoRoot, thread.id);
    expect(getThread(repoRoot, thread.id)?.status).toBe("open");
  });

  it("should throw when replying to non-existent thread", () => {
    expect(() =>
      replyToThread(repoRoot, "t-999", { message: "hello" })
    ).toThrow("Thread t-999 not found");
  });
});
