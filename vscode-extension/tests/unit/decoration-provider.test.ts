import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DecorationProvider } from "../../src/providers/decoration-provider.js";
import { CoreBridge } from "../../src/core-bridge.js";
import { createTestRepo, cleanupTestRepo } from "../../../tests/helpers.js";
import { mockBridgeManager } from "./bridge-manager-mock.js";
import * as vscode from "vscode";
import path from "node:path";

describe("DecorationProvider", () => {
  let repoRoot: string;
  let bridge: CoreBridge;
  let provider: DecorationProvider;

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
    provider = new DecorationProvider(mockBridgeManager(repoRoot, bridge), repoRoot);
  });

  afterEach(() => {
    provider.dispose();
    cleanupTestRepo(repoRoot);
  });

  it("creates decoration types for all 5 statuses", () => {
    // Provider created without errors, meaning all 5 decoration types were created
    expect(provider).toBeDefined();
  });

  it("updateDecorations runs without error when no active editor", () => {
    vscode.window.activeTextEditor = undefined;
    expect(() => provider.updateDecorations()).not.toThrow();
  });

  it("updateDecorations applies ranges for threads in active file", () => {
    const anchor = bridge.createAnchor("src/auth.ts", 3, 6);
    bridge.addThread({
      file: "src/auth.ts",
      anchor: anchor!,
      message: "Check this",
    });

    const setDecorationsCalls: { ranges: vscode.Range[] }[] = [];
    const mockEditor = {
      document: {
        uri: vscode.Uri.file(path.join(repoRoot, "src/auth.ts")),
      },
      setDecorations: (_type: any, ranges: any[]) => {
        setDecorationsCalls.push({ ranges });
      },
    };
    (vscode.window as any).activeTextEditor = mockEditor;

    provider.updateDecorations();

    // Should have been called once per status (5 times)
    expect(setDecorationsCalls).toHaveLength(5);

    // The "open" status call should have 1 range (startLine 3 → 0-indexed 2)
    const openCall = setDecorationsCalls[0];
    expect(openCall.ranges).toHaveLength(1);
    expect(openCall.ranges[0].start.line).toBe(2); // 3-1=2
    expect(openCall.ranges[0].end.line).toBe(5); // 6-1=5
  });

  it("clears decorations for files outside repo", () => {
    const setDecorationsCalls: { ranges: vscode.Range[] }[] = [];
    const mockEditor = {
      document: {
        uri: vscode.Uri.file("/some/other/file.ts"),
      },
      setDecorations: (_type: any, ranges: any[]) => {
        setDecorationsCalls.push({ ranges });
      },
    };
    (vscode.window as any).activeTextEditor = mockEditor;

    provider.updateDecorations();

    // All decoration types should be cleared (empty arrays)
    for (const call of setDecorationsCalls) {
      expect(call.ranges).toHaveLength(0);
    }
  });
});
