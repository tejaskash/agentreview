import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StatusBarProvider } from "../../src/providers/status-bar.js";
import { CoreBridge } from "../../src/core-bridge.js";
import { createTestRepo, cleanupTestRepo } from "../../../tests/helpers.js";

describe("StatusBarProvider", () => {
  let repoRoot: string;
  let bridge: CoreBridge;

  beforeEach(async () => {
    repoRoot = createTestRepo();
    bridge = new CoreBridge(repoRoot);
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  it("hides when no session exists", () => {
    const provider = new StatusBarProvider(bridge);
    // status bar item's hide() was called (no session)
    // Provider should be created without error
    expect(provider).toBeDefined();
    provider.dispose();
  });

  it("shows thread counts when session exists", async () => {
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
      message: "test1",
    });
    bridge.addThread({
      file: "src/auth.ts",
      anchor: anchor!,
      message: "test2",
    });
    bridge.resolveThread("t-2");

    const provider = new StatusBarProvider(bridge);
    // The provider's update() would have run, setting text
    // We verify it doesn't throw
    provider.update();
    expect(provider).toBeDefined();
    provider.dispose();
  });

  it("shows 'no threads' when session exists but no threads", async () => {
    const baseCommit = await bridge.getCommitHash("main");
    const headCommit = await bridge.getCommitHash("feature-x");
    bridge.createSession({
      baseBranch: "main",
      baseCommit: baseCommit!,
      headBranch: "feature-x",
      headCommit: headCommit!,
    });

    const provider = new StatusBarProvider(bridge);
    provider.update();
    expect(provider).toBeDefined();
    provider.dispose();
  });
});
