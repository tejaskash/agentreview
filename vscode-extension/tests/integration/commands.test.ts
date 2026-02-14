import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as vscode from "vscode";
import path from "node:path";
import { CoreBridge } from "../../src/core-bridge.js";
import { createTestRepo, cleanupTestRepo } from "../../../tests/helpers.js";
import { initSession } from "../../src/commands/init-session.js";
import { addThread } from "../../src/commands/add-thread.js";
import { showStatus } from "../../src/commands/show-status.js";
import { exportBundle } from "../../src/commands/export-bundle.js";

describe("Commands", () => {
  let repoRoot: string;
  let bridge: CoreBridge;

  beforeEach(() => {
    repoRoot = createTestRepo();
    bridge = new CoreBridge(repoRoot);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanupTestRepo(repoRoot);
  });

  describe("initSession", () => {
    it("creates session when base branch input is provided", async () => {
      vi.spyOn(vscode.window, "showInputBox").mockResolvedValue("main");
      const infoSpy = vi.spyOn(vscode.window, "showInformationMessage");

      await initSession(bridge);

      expect(bridge.sessionExists()).toBe(true);
      const session = bridge.loadSession();
      expect(session!.baseBranch).toBe("main");
      expect(session!.headBranch).toBe("feature-x");
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("feature-x")
      );
    });

    it("shows error for non-git directory", async () => {
      const badBridge = new CoreBridge("/tmp/nonexistent-xyz");
      const errorSpy = vi.spyOn(vscode.window, "showErrorMessage");
      await initSession(badBridge);
      expect(errorSpy).toHaveBeenCalledWith("Not a git repository.");
    });

    it("warns if session already exists", async () => {
      // Create session first
      const baseCommit = await bridge.getCommitHash("main");
      const headCommit = await bridge.getCommitHash("feature-x");
      bridge.createSession({
        baseBranch: "main",
        baseCommit: baseCommit!,
        headBranch: "feature-x",
        headCommit: headCommit!,
      });

      const warnSpy = vi.spyOn(vscode.window, "showWarningMessage");
      await initSession(bridge);
      expect(warnSpy).toHaveBeenCalledWith(
        "A review session already exists."
      );
    });

    it("aborts when user cancels input", async () => {
      vi.spyOn(vscode.window, "showInputBox").mockResolvedValue(undefined);
      await initSession(bridge);
      expect(bridge.sessionExists()).toBe(false);
    });
  });

  describe("addThread", () => {
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

    it("shows error when no session", async () => {
      const noBridge = new CoreBridge("/tmp/nonexistent");
      const errorSpy = vi.spyOn(vscode.window, "showErrorMessage");
      await addThread(noBridge);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("No review session")
      );
    });

    it("shows error when no active editor", async () => {
      (vscode.window as any).activeTextEditor = undefined;
      const errorSpy = vi.spyOn(vscode.window, "showErrorMessage");
      await addThread(bridge);
      expect(errorSpy).toHaveBeenCalledWith("No active editor.");
    });

    it("shows error when no selection", async () => {
      (vscode.window as any).activeTextEditor = {
        document: {
          uri: vscode.Uri.file(path.join(repoRoot, "src/auth.ts")),
        },
        selection: { isEmpty: true, start: { line: 0 }, end: { line: 0 } },
      };
      const errorSpy = vi.spyOn(vscode.window, "showErrorMessage");
      await addThread(bridge);
      expect(errorSpy).toHaveBeenCalledWith(
        "Select code to create a review thread."
      );
    });

    it("creates thread with valid input", async () => {
      (vscode.window as any).activeTextEditor = {
        document: {
          uri: vscode.Uri.file(path.join(repoRoot, "src/auth.ts")),
        },
        selection: {
          isEmpty: false,
          start: { line: 2, character: 0 },
          end: { line: 5, character: 0 },
        },
      };
      vi.spyOn(vscode.window, "showInputBox").mockResolvedValue(
        "Check this logic"
      );
      vi.spyOn(vscode.window, "showQuickPick").mockResolvedValue(
        "must-fix" as any
      );
      const infoSpy = vi.spyOn(vscode.window, "showInformationMessage");

      await addThread(bridge);

      const threads = bridge.listThreads();
      expect(threads).toHaveLength(1);
      expect(threads[0].severity).toBe("must-fix");
      expect(threads[0].messages[0].body).toBe("Check this logic");
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("t-1")
      );
    });
  });

  describe("showStatus", () => {
    it("shows error when no session", async () => {
      const errorSpy = vi.spyOn(vscode.window, "showErrorMessage");
      await showStatus(bridge);
      expect(errorSpy).toHaveBeenCalledWith("No review session found.");
    });

    it("shows status info with session", async () => {
      const baseCommit = await bridge.getCommitHash("main");
      const headCommit = await bridge.getCommitHash("feature-x");
      bridge.createSession({
        baseBranch: "main",
        baseCommit: baseCommit!,
        headBranch: "feature-x",
        headCommit: headCommit!,
      });
      const infoSpy = vi.spyOn(vscode.window, "showInformationMessage");
      await showStatus(bridge);
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("feature-x"),
        expect.anything()
      );
    });
  });

  describe("exportBundle", () => {
    it("shows error when no session", async () => {
      const errorSpy = vi.spyOn(vscode.window, "showErrorMessage");
      await exportBundle(bridge);
      expect(errorSpy).toHaveBeenCalledWith("No review session found.");
    });

    it("exports to clipboard", async () => {
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
        message: "review",
      });

      vi.spyOn(vscode.window, "showQuickPick").mockResolvedValue(
        "Copy to clipboard" as any
      );
      const clipSpy = vi.spyOn(vscode.env.clipboard, "writeText");
      const infoSpy = vi.spyOn(vscode.window, "showInformationMessage");

      await exportBundle(bridge);

      expect(clipSpy).toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith(
        expect.stringContaining("1 threads")
      );
    });
  });
});
