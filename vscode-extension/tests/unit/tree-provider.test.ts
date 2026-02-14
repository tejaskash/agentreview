import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ArvTreeProvider,
  SessionNode,
  StatusGroupNode,
  ThreadNode,
} from "../../src/providers/tree-provider.js";
import { CoreBridge } from "../../src/core-bridge.js";
import { createTestRepo, cleanupTestRepo } from "../../../tests/helpers.js";

describe("ArvTreeProvider", () => {
  let repoRoot: string;
  let bridge: CoreBridge;
  let provider: ArvTreeProvider;

  beforeEach(async () => {
    repoRoot = createTestRepo();
    bridge = new CoreBridge(repoRoot);
    const baseCommit = await bridge.getCommitHash("main");
    const headCommit = await bridge.getCommitHash("feature-x");
    bridge.createSession({
      baseBranch: "main",
      baseCommit: baseCommit!,
      headBranch: "feature-x",
      headCommit: headCommit!,
    });
    provider = new ArvTreeProvider(bridge);
  });

  afterEach(() => {
    provider.dispose();
    cleanupTestRepo(repoRoot);
  });

  it("returns session node + 5 status groups at root", () => {
    const children = provider.getChildren();
    expect(children).toHaveLength(6); // 1 session + 5 status groups
    expect(children[0]).toBeInstanceOf(SessionNode);
    expect(children[1]).toBeInstanceOf(StatusGroupNode);
    expect(children[5]).toBeInstanceOf(StatusGroupNode);
  });

  it("session node shows branch info", () => {
    const children = provider.getChildren();
    const session = children[0] as SessionNode;
    expect(session.label).toContain("feature-x");
    expect(session.label).toContain("main");
  });

  it("status groups show correct counts with no threads", () => {
    const children = provider.getChildren();
    for (let i = 1; i <= 5; i++) {
      const group = children[i] as StatusGroupNode;
      expect(group.count).toBe(0);
    }
  });

  it("shows threads under correct status group", () => {
    const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
    bridge.addThread({
      file: "src/auth.ts",
      anchor: anchor!,
      message: "Check this",
      severity: "must-fix",
    });
    bridge.addThread({
      file: "src/auth.ts",
      anchor: anchor!,
      message: "Another one",
      severity: "suggestion",
    });
    provider.refresh();

    const children = provider.getChildren();
    // Open group (index 1) should have 2 threads
    const openGroup = children[1] as StatusGroupNode;
    expect(openGroup.status).toBe("open");
    expect(openGroup.count).toBe(2);

    const threads = provider.getChildren(openGroup);
    expect(threads).toHaveLength(2);
    expect(threads[0]).toBeInstanceOf(ThreadNode);
  });

  it("thread node shows file and line range", () => {
    const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
    bridge.addThread({
      file: "src/auth.ts",
      anchor: anchor!,
      message: "Check this",
      severity: "must-fix",
    });
    provider.refresh();

    const openGroup = provider.getChildren()[1] as StatusGroupNode;
    const threads = provider.getChildren(openGroup);
    const threadNode = threads[0] as ThreadNode;
    expect(threadNode.label).toContain("src/auth.ts");
    expect(threadNode.label).toContain("3-6");
    expect(threadNode.description).toBe("[must-fix]");
  });

  it("thread node has command to open thread", () => {
    const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
    bridge.addThread({
      file: "src/auth.ts",
      anchor: anchor!,
      message: "test",
    });
    provider.refresh();

    const openGroup = provider.getChildren()[1] as StatusGroupNode;
    const threads = provider.getChildren(openGroup);
    const threadNode = threads[0] as ThreadNode;
    expect(threadNode.command).toBeDefined();
    expect(threadNode.command!.command).toBe("arv.openThread");
    expect(threadNode.command!.arguments).toEqual(["t-1"]);
  });

  it("resolved threads appear under resolved group", () => {
    const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
    bridge.addThread({
      file: "src/auth.ts",
      anchor: anchor!,
      message: "test",
    });
    bridge.resolveThread("t-1");
    provider.refresh();

    const children = provider.getChildren();
    const resolvedGroup = children[4] as StatusGroupNode;
    expect(resolvedGroup.status).toBe("resolved");
    expect(resolvedGroup.count).toBe(1);
  });

  it("returns no children for non-group nodes", () => {
    const children = provider.getChildren();
    const session = children[0] as SessionNode;
    expect(provider.getChildren(session)).toEqual([]);
  });

  it("returns only status groups when no session", () => {
    const noBridge = new CoreBridge("/tmp/nonexistent-xyz");
    const noProvider = new ArvTreeProvider(noBridge);
    const children = noProvider.getChildren();
    // No session node, just 5 status groups
    expect(children).toHaveLength(5);
    expect(children[0]).toBeInstanceOf(StatusGroupNode);
    noProvider.dispose();
  });
});
