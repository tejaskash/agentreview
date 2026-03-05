import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { CoreBridge } from "../../src/core-bridge.js";
import { createTestRepo, cleanupTestRepo } from "../helpers.js";
import { createSession } from "agntrev/session";
import { addThread } from "agntrev/threads";
import { createAnchor } from "agntrev/anchors";

describe("CoreBridge", () => {
  let repoRoot: string;
  let bridge: CoreBridge;

  beforeEach(() => {
    repoRoot = createTestRepo();
    bridge = new CoreBridge(repoRoot);
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  describe("session operations", () => {
    it("sessionExists returns false when no session", () => {
      expect(bridge.sessionExists()).toBe(false);
    });

    it("sessionExists returns true after creating session", async () => {
      const baseCommit = await bridge.getCommitHash("main");
      const headCommit = await bridge.getCommitHash("feature-x");
      bridge.createSession({
        baseBranch: "main",
        baseCommit: baseCommit!,
        headBranch: "feature-x",
        headCommit: headCommit!,
      });
      expect(bridge.sessionExists()).toBe(true);
    });

    it("loadSession returns undefined when no session", () => {
      expect(bridge.loadSession()).toBeUndefined();
    });

    it("loadSession returns session after creation", async () => {
      const baseCommit = await bridge.getCommitHash("main");
      const headCommit = await bridge.getCommitHash("feature-x");
      bridge.createSession({
        baseBranch: "main",
        baseCommit: baseCommit!,
        headBranch: "feature-x",
        headCommit: headCommit!,
      });
      const session = bridge.loadSession();
      expect(session).toBeDefined();
      expect(session!.baseBranch).toBe("main");
      expect(session!.headBranch).toBe("feature-x");
    });
  });

  describe("git operations", () => {
    it("isGitRepo returns true for git repo", async () => {
      expect(await bridge.isGitRepo()).toBe(true);
    });

    it("isGitRepo returns false for non-git directory", async () => {
      const badBridge = new CoreBridge("/tmp/nonexistent-dir-xyz");
      expect(await badBridge.isGitRepo()).toBe(false);
    });

    it("getCurrentBranch returns current branch", async () => {
      expect(await bridge.getCurrentBranch()).toBe("feature-x");
    });

    it("branchExists returns true for existing branch", async () => {
      expect(await bridge.branchExists("main")).toBe(true);
    });

    it("branchExists returns false for non-existing branch", async () => {
      expect(await bridge.branchExists("nonexistent")).toBe(false);
    });
  });

  describe("thread operations", () => {
    beforeEach(async () => {
      const baseCommit = await bridge.getCommitHash("main");
      const headCommit = await bridge.getCommitHash("feature-x");
      bridge.createSession({
        baseBranch: "main",
        baseCommit: baseCommit!,
        headBranch: "feature-x",
        headCommit: headCommit!,
      });
    });

    it("listThreads returns empty array when no threads", () => {
      expect(bridge.listThreads()).toEqual([]);
    });

    it("listThreads returns empty array on error", () => {
      const badBridge = new CoreBridge("/tmp/nonexistent");
      expect(badBridge.listThreads()).toEqual([]);
    });

    it("addThread creates a thread", () => {
      const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
      expect(anchor).toBeDefined();
      const thread = bridge.addThread({
        file: "src/auth.ts",
        anchor: anchor!,
        message: "Check this login logic",
        severity: "must-fix",
      });
      expect(thread).toBeDefined();
      expect(thread!.id).toBe("t-1");
      expect(thread!.severity).toBe("must-fix");
      expect(thread!.status).toBe("open");
    });

    it("getThread returns thread by id", () => {
      const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
      bridge.addThread({
        file: "src/auth.ts",
        anchor: anchor!,
        message: "test",
      });
      const thread = bridge.getThread("t-1");
      expect(thread).toBeDefined();
      expect(thread!.id).toBe("t-1");
    });

    it("getThread returns undefined for missing thread", () => {
      expect(bridge.getThread("t-999")).toBeUndefined();
    });

    it("resolveThread sets status to resolved", () => {
      const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
      bridge.addThread({ file: "src/auth.ts", anchor: anchor!, message: "test" });
      const resolved = bridge.resolveThread("t-1");
      expect(resolved!.status).toBe("resolved");
    });

    it("reopenThread sets status to open", () => {
      const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
      bridge.addThread({ file: "src/auth.ts", anchor: anchor!, message: "test" });
      bridge.resolveThread("t-1");
      const reopened = bridge.reopenThread("t-1");
      expect(reopened!.status).toBe("open");
    });

    it("replyToThread adds a message", () => {
      const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
      bridge.addThread({ file: "src/auth.ts", anchor: anchor!, message: "test" });
      const updated = bridge.replyToThread("t-1", {
        message: "I'll fix this",
        role: "agent",
      });
      expect(updated!.messages).toHaveLength(2);
      expect(updated!.messages[1].role).toBe("agent");
    });
  });

  describe("anchor operations", () => {
    it("createAnchor returns undefined for invalid file", () => {
      expect(bridge.createAnchor("nonexistent.ts", 1, 2)).toBeUndefined();
    });

    it("reanchorThreads returns empty arrays on error", () => {
      const badBridge = new CoreBridge("/tmp/nonexistent");
      expect(badBridge.reanchorThreads(["foo.ts"])).toEqual({
        addressed: [],
        orphaned: [],
      });
    });
  });

  describe("export operations", () => {
    it("generateExportBundle returns undefined when no session", async () => {
      expect(await bridge.generateExportBundle()).toBeUndefined();
    });

    it("generates export bundle with session", async () => {
      const baseCommit = await bridge.getCommitHash("main");
      const headCommit = await bridge.getCommitHash("feature-x");
      bridge.createSession({
        baseBranch: "main",
        baseCommit: baseCommit!,
        headBranch: "feature-x",
        headCommit: headCommit!,
      });
      const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
      bridge.addThread({
        file: "src/auth.ts",
        anchor: anchor!,
        message: "review this",
      });
      const bundle = await bridge.generateExportBundle();
      expect(bundle).toBeDefined();
      expect(bundle!.threads).toHaveLength(1);
      expect(bundle!.diff).toBeTruthy();
    });
  });
});
