import * as vscode from "vscode";
import type { CoreBridge } from "../core-bridge.js";
import type { Thread, ThreadStatus, Session } from "../../../src/types.js";
import { eventBus } from "../event-bus.js";

const STATUS_ORDER: ThreadStatus[] = [
  "open",
  "needs-human",
  "addressed",
  "resolved",
  "orphaned",
];

const STATUS_LABELS: Record<ThreadStatus, string> = {
  open: "Open",
  "needs-human": "Needs Human",
  addressed: "Addressed",
  resolved: "Resolved",
  orphaned: "Orphaned",
};

const STATUS_ICONS: Record<ThreadStatus, string> = {
  open: "circle-filled",
  "needs-human": "person",
  addressed: "check",
  resolved: "pass-filled",
  orphaned: "warning",
};

type TreeNode = SessionNode | StatusGroupNode | ThreadNode;

export class SessionNode extends vscode.TreeItem {
  constructor(public readonly session: Session) {
    super(
      `Session: ${session.headBranch} → ${session.baseBranch}`,
      vscode.TreeItemCollapsibleState.None
    );
    this.description = session.status;
    this.iconPath = new vscode.ThemeIcon("git-branch");
    this.contextValue = "session";
  }
}

export class StatusGroupNode extends vscode.TreeItem {
  constructor(
    public readonly status: ThreadStatus,
    public readonly count: number
  ) {
    super(
      `${STATUS_LABELS[status]} (${count})`,
      count > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed
    );
    this.iconPath = new vscode.ThemeIcon(STATUS_ICONS[status]);
    this.contextValue = "statusGroup";
  }
}

export class ThreadNode extends vscode.TreeItem {
  constructor(public readonly thread: Thread) {
    const lineRange =
      thread.anchor.startLine === thread.anchor.endLine
        ? `${thread.anchor.startLine}`
        : `${thread.anchor.startLine}-${thread.anchor.endLine}`;
    super(
      `${thread.id}  ${thread.file}:${lineRange}`,
      vscode.TreeItemCollapsibleState.None
    );
    this.description = `[${thread.severity}]`;
    this.tooltip = thread.messages[0]?.body;
    this.iconPath = new vscode.ThemeIcon(STATUS_ICONS[thread.status]);
    this.contextValue = "thread";
    this.command = {
      command: "arv.openThread",
      title: "Open Thread",
      arguments: [thread.id],
    };
  }
}

export class ArvTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private threads: Thread[] = [];
  private session: Session | undefined;

  constructor(private bridge: CoreBridge) {
    this.refresh();
    eventBus.onThreadsChanged(() => this.refresh());
    eventBus.onSessionChanged(() => this.refresh());
  }

  refresh(): void {
    this.session = this.bridge.loadSession();
    this.threads = this.bridge.listThreads();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      // Root level
      const nodes: TreeNode[] = [];
      if (this.session) {
        nodes.push(new SessionNode(this.session));
      }
      for (const status of STATUS_ORDER) {
        const count = this.threads.filter((t) => t.status === status).length;
        nodes.push(new StatusGroupNode(status, count));
      }
      return nodes;
    }

    if (element instanceof StatusGroupNode) {
      return this.threads
        .filter((t) => t.status === element.status)
        .map((t) => new ThreadNode(t));
    }

    return [];
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
