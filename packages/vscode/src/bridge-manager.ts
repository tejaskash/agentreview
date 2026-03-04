import * as vscode from "vscode";
import path from "node:path";
import fs from "node:fs";
import { CoreBridge } from "./core-bridge.js";
import { FileWatcher } from "./watchers/file-watcher.js";

export class BridgeManager {
  private bridges: Map<string, CoreBridge> = new Map();
  private watchers: Map<string, FileWatcher> = new Map();

  /** Discover all repos with .agentreview/session.json or .git in workspace folders */
  async discoverRepos(): Promise<void> {
    // Check each workspace folder root
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return;

    for (const folder of folders) {
      this.addRepoIfNeeded(folder.uri.fsPath);
    }

    // Also search for nested repos via session files
    const sessionFiles = await vscode.workspace.findFiles(
      "**/.agentreview/session.json",
      "**/node_modules/**"
    );
    for (const uri of sessionFiles) {
      // session.json is at <repoRoot>/.agentreview/session.json
      const repoRoot = path.dirname(path.dirname(uri.fsPath));
      this.addRepoIfNeeded(repoRoot);
    }
  }

  /** Add a repo root if not already tracked */
  addRepoIfNeeded(repoRoot: string): CoreBridge | undefined {
    const normalized = normalizePath(repoRoot);

    // Verify it looks like a git repo
    if (!fs.existsSync(path.join(normalized, ".git"))) {
      return undefined;
    }

    if (this.bridges.has(normalized)) {
      return this.bridges.get(normalized)!;
    }

    const bridge = new CoreBridge(normalized);
    this.bridges.set(normalized, bridge);

    const watcher = new FileWatcher(normalized);
    this.watchers.set(normalized, watcher);

    return bridge;
  }

  /** Find bridge for a given file path (longest-prefix match) */
  getBridgeForFile(filePath: string): CoreBridge | undefined {
    const normalized = normalizePath(filePath);
    let bestMatch: string | undefined;
    let bestLength = 0;

    for (const repoRoot of this.bridges.keys()) {
      if (normalized.startsWith(repoRoot + path.sep) || normalized === repoRoot) {
        if (repoRoot.length > bestLength) {
          bestLength = repoRoot.length;
          bestMatch = repoRoot;
        }
      }
    }

    return bestMatch ? this.bridges.get(bestMatch) : undefined;
  }

  /** Get bridge for the active text editor's file */
  getActiveBridge(): CoreBridge | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const bridge = this.getBridgeForFile(editor.document.uri.fsPath);
      if (bridge) return bridge;
    }
    // Fallback: if only one bridge, return it
    if (this.bridges.size === 1) {
      return this.bridges.values().next().value;
    }
    return undefined;
  }

  /** Pick a bridge interactively — returns immediately if only one or if active editor resolves */
  async pickBridge(prompt?: string): Promise<CoreBridge | undefined> {
    if (this.bridges.size === 0) return undefined;
    if (this.bridges.size === 1) {
      return this.bridges.values().next().value;
    }

    // Try active editor first
    const activeBridge = this.getActiveBridge();
    if (activeBridge) return activeBridge;

    // Show QuickPick
    const items = Array.from(this.bridges.entries()).map(([root, bridge]) => ({
      label: path.basename(root),
      description: root,
      bridge,
    }));

    const choice = await vscode.window.showQuickPick(items, {
      placeHolder: prompt ?? "Select a repository",
    });

    return choice?.bridge;
  }

  /** Get all bridges */
  getAllBridges(): Map<string, CoreBridge> {
    return this.bridges;
  }

  /** Get bridges where a session exists */
  getActiveBridges(): Map<string, CoreBridge> {
    const active = new Map<string, CoreBridge>();
    for (const [root, bridge] of this.bridges) {
      if (bridge.sessionExists()) {
        active.set(root, bridge);
      }
    }
    return active;
  }

  dispose(): void {
    for (const watcher of this.watchers.values()) {
      watcher.dispose();
    }
    this.watchers.clear();
    this.bridges.clear();
  }
}

function normalizePath(p: string): string {
  return path.resolve(p);
}
