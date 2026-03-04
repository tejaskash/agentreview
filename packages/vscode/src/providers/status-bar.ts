import * as vscode from "vscode";
import path from "node:path";
import type { BridgeManager } from "../bridge-manager.js";
import { eventBus } from "../event-bus.js";

export class StatusBarProvider {
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];

  constructor(private manager: BridgeManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = "arvThreads.focus";
    this.update();

    eventBus.onThreadsChanged(() => this.update());
    eventBus.onSessionChanged(() => this.update());
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.update())
    );
  }

  update(): void {
    const activeBridges = this.manager.getActiveBridges();

    if (activeBridges.size === 0) {
      this.statusBarItem.hide();
      return;
    }

    // Try to show status for active editor's repo
    const activeBridge = this.manager.getActiveBridge();

    if (activeBridge && activeBridge.sessionExists()) {
      const threads = activeBridge.listThreads();
      const open = threads.filter((t) => t.status === "open").length;
      const needsHuman = threads.filter((t) => t.status === "needs-human").length;
      const addressed = threads.filter((t) => t.status === "addressed").length;
      const resolved = threads.filter((t) => t.status === "resolved").length;
      const orphaned = threads.filter((t) => t.status === "orphaned").length;

      const parts: string[] = [];
      if (open > 0) parts.push(`${open} open`);
      if (needsHuman > 0) parts.push(`${needsHuman} needs-human`);
      if (addressed > 0) parts.push(`${addressed} addressed`);
      if (resolved > 0) parts.push(`${resolved} resolved`);
      if (orphaned > 0) parts.push(`${orphaned} orphaned`);

      const summary = parts.length > 0 ? parts.join(", ") : "no threads";
      const repoName = activeBridges.size > 1
        ? ` [${path.basename(activeBridge.repoRoot)}]`
        : "";
      this.statusBarItem.text = `$(comment-discussion) ARV${repoName}: ${summary}`;
      this.statusBarItem.tooltip = `Agent Review — ${threads.length} total threads`;
    } else if (activeBridges.size > 1) {
      // Aggregate across all active bridges
      let totalThreads = 0;
      for (const bridge of activeBridges.values()) {
        totalThreads += bridge.listThreads().length;
      }
      this.statusBarItem.text = `$(comment-discussion) ARV: ${totalThreads} threads (${activeBridges.size} repos)`;
      this.statusBarItem.tooltip = `Agent Review — ${activeBridges.size} active repos`;
    } else {
      // Single repo but not matched to active editor
      const [, bridge] = activeBridges.entries().next().value!;
      const threads = bridge.listThreads();
      const open = threads.filter((t) => t.status === "open").length;
      const resolved = threads.filter((t) => t.status === "resolved").length;
      const summary = `${open} open, ${resolved} resolved`;
      this.statusBarItem.text = `$(comment-discussion) ARV: ${summary}`;
      this.statusBarItem.tooltip = `Agent Review — ${threads.length} total threads`;
    }

    this.statusBarItem.show();
  }

  dispose(): void {
    this.statusBarItem.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
