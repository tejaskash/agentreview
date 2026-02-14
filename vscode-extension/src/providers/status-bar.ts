import * as vscode from "vscode";
import type { CoreBridge } from "../core-bridge.js";
import { eventBus } from "../event-bus.js";

export class StatusBarProvider {
  private statusBarItem: vscode.StatusBarItem;

  constructor(private bridge: CoreBridge) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = "arvThreads.focus";
    this.update();

    eventBus.onThreadsChanged(() => this.update());
    eventBus.onSessionChanged(() => this.update());
  }

  update(): void {
    if (!this.bridge.sessionExists()) {
      this.statusBarItem.hide();
      return;
    }

    const threads = this.bridge.listThreads();
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
    this.statusBarItem.text = `$(comment-discussion) ARV: ${summary}`;
    this.statusBarItem.tooltip = `Agent Review — ${threads.length} total threads`;
    this.statusBarItem.show();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
