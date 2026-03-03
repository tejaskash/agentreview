import * as vscode from "vscode";
import path from "node:path";
import type { BridgeManager } from "../bridge-manager.js";
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

type TreeNode = RepoNode | SessionNode | StatusGroupNode | ThreadNode;

export class RepoNode extends vscode.TreeItem {
  constructor(
    public readonly repoRoot: string,
    public readonly session: Session | undefined,
    public readonly threads: Thread[]
  ) {
    super(
      path.basename(repoRoot),
      vscode.TreeItemCollapsibleState.Expanded
    );
    this.description = session ? session.headBranch : "no session";
    this.iconPath = new vscode.ThemeIcon("repo");
    this.contextValue = "repo";
  }
}

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
    public readonly count: number,
    public readonly repoRoot?: string
  ) {
    super(
      `${STATUS_LABELS[status]} (${count})`,
      count > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed
    );
    this.iconPath = new vscode.ThemeIcon(STATUS_ICONS[status]);
    this.contextValue = status === "resolved" ? "statusGroup" : "statusGroupResolvable";
  }
}

export class ThreadNode extends vscode.TreeItem {
  constructor(public readonly thread: Thread, repoRoot?: string) {
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
      arguments: [thread.id, repoRoot],
    };
  }
}

interface RepoData {
  repoRoot: string;
  session: Session | undefined;
  threads: Thread[];
}

export class ArvTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private repos: RepoData[] = [];
  private multiRepo = false;

  constructor(private manager: BridgeManager) {
    this.refresh();
    eventBus.onThreadsChanged(() => this.refresh());
    eventBus.onSessionChanged(() => this.refresh());
  }

  refresh(): void {
    const bridges = this.manager.getAllBridges();
    this.repos = [];

    for (const [repoRoot, bridge] of bridges) {
      this.repos.push({
        repoRoot,
        session: bridge.loadSession(),
        threads: bridge.listThreads(),
      });
    }

    this.multiRepo = this.repos.length > 1;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      if (this.multiRepo) {
        // Root shows RepoNodes
        return this.repos.map(
          (r) => new RepoNode(r.repoRoot, r.session, r.threads)
        );
      }
      // Single repo: show flat structure (same as before)
      const repo = this.repos[0];
      if (!repo) return [];
      return this.buildRepoChildren(repo);
    }

    if (element instanceof RepoNode) {
      const repo = this.repos.find((r) => r.repoRoot === element.repoRoot);
      if (!repo) return [];
      return this.buildRepoChildren(repo);
    }

    if (element instanceof StatusGroupNode) {
      const repo = element.repoRoot
        ? this.repos.find((r) => r.repoRoot === element.repoRoot)
        : this.repos[0];
      if (!repo) return [];
      return repo.threads
        .filter((t) => t.status === element.status)
        .map((t) => new ThreadNode(t, repo.repoRoot));
    }

    return [];
  }

  private buildRepoChildren(repo: RepoData): TreeNode[] {
    const nodes: TreeNode[] = [];
    if (repo.session) {
      nodes.push(new SessionNode(repo.session));
    }
    for (const status of STATUS_ORDER) {
      const count = repo.threads.filter((t) => t.status === status).length;
      nodes.push(new StatusGroupNode(status, count, repo.repoRoot));
    }
    return nodes;
  }

  dispose(): void {
    this._onDidChangeTreeData.dispose();
  }
}
