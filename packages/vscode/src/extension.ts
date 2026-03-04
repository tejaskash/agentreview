import * as vscode from "vscode";
import { BridgeManager } from "./bridge-manager.js";
import { eventBus } from "./event-bus.js";
import { getRepoRoot } from "./util/workspace.js";
import { ArvTreeProvider } from "./providers/tree-provider.js";
import { DecorationProvider } from "./providers/decoration-provider.js";
import { StatusBarProvider } from "./providers/status-bar.js";
import { ArvCommentProvider } from "./providers/comment-provider.js";
import { openThreadPanel } from "./panels/thread-panel.js";
import { initSession } from "./commands/init-session.js";
import { addThread } from "./commands/add-thread.js";
import { exportBundle } from "./commands/export-bundle.js";
import { applyPatchCommand } from "./commands/apply-patch.js";
import { showStatus } from "./commands/show-status.js";

let manager: BridgeManager | undefined;
let treeProvider: ArvTreeProvider | undefined;
let decorationProvider: DecorationProvider | undefined;
let statusBarProvider: StatusBarProvider | undefined;
let commentProvider: ArvCommentProvider | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  manager = new BridgeManager();

  // Discover repos from workspace folders and existing session files
  await manager.discoverRepos();

  // Fallback: if no repos discovered, try the first workspace folder
  if (manager.getAllBridges().size === 0) {
    const repoRoot = getRepoRoot();
    if (!repoRoot) {
      context.subscriptions.push(
        vscode.commands.registerCommand("arv.initSession", () =>
          vscode.window.showErrorMessage("Open a workspace folder first.")
        )
      );
      return;
    }
    manager.addRepoIfNeeded(repoRoot);
  }

  const extensionPath = context.extensionPath;

  // Providers
  treeProvider = new ArvTreeProvider(manager);
  decorationProvider = new DecorationProvider(manager, extensionPath);
  statusBarProvider = new StatusBarProvider(manager);
  commentProvider = new ArvCommentProvider(manager);

  // Register tree view
  const treeView = vscode.window.createTreeView("arvThreads", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Register hover provider
  const hoverDisposable = decorationProvider.registerHoverProvider();

  // Watch for workspace folder changes
  const folderWatcher = vscode.workspace.onDidChangeWorkspaceFolders(async () => {
    await manager!.discoverRepos();
    eventBus.emitSessionChanged();
    eventBus.emitThreadsChanged();
  });

  // Watch for new session.json files (e.g., arv init from CLI)
  const sessionWatcher = vscode.workspace.createFileSystemWatcher(
    "**/.agentreview/session.json"
  );
  sessionWatcher.onDidCreate(async (uri) => {
    const path = await import("node:path");
    const repoRoot = path.dirname(path.dirname(uri.fsPath));
    manager!.addRepoIfNeeded(repoRoot);
    eventBus.emitSessionChanged();
    eventBus.emitThreadsChanged();
  });

  // Register commands
  context.subscriptions.push(
    treeView,
    hoverDisposable,
    folderWatcher,
    sessionWatcher,
    vscode.commands.registerCommand("arv.initSession", async () => {
      const bridge = await manager!.pickBridge("Select repo to initialize session");
      if (bridge) initSession(bridge);
    }),
    vscode.commands.registerCommand("arv.addThread", async () => {
      const bridge = manager!.getActiveBridge();
      if (bridge) {
        addThread(bridge);
      } else {
        vscode.window.showErrorMessage("Could not determine repository for active editor.");
      }
    }),
    vscode.commands.registerCommand("arv.exportBundle", async () => {
      const bridge = await manager!.pickBridge("Select repo to export");
      if (bridge) exportBundle(bridge);
    }),
    vscode.commands.registerCommand("arv.applyPatch", async () => {
      const bridge = await manager!.pickBridge("Select repo to apply patch");
      if (bridge) applyPatchCommand(bridge);
    }),
    vscode.commands.registerCommand("arv.showStatus", async () => {
      const bridge = await manager!.pickBridge("Select repo to show status");
      if (bridge) showStatus(bridge);
    }),
    vscode.commands.registerCommand("arv.openThread", (threadId: string, repoRoot?: string) => {
      if (repoRoot) {
        // Tree node provides repoRoot directly
        const bridge = manager!.getAllBridges().get(repoRoot);
        if (bridge) {
          if (commentProvider) {
            commentProvider.revealThread(threadId, bridge);
          } else {
            openThreadPanel(bridge, threadId, extensionPath);
          }
          return;
        }
      }
      // Fallback: search all bridges
      for (const bridge of manager!.getAllBridges().values()) {
        const thread = bridge.getThread(threadId);
        if (thread) {
          if (commentProvider) {
            commentProvider.revealThread(threadId, bridge);
          } else {
            openThreadPanel(bridge, threadId, extensionPath);
          }
          return;
        }
      }
      vscode.window.showErrorMessage(`Thread ${threadId} not found.`);
    }),

    // Comment API handlers
    vscode.commands.registerCommand("arv.replyComment", (reply: vscode.CommentReply) =>
      commentProvider?.handleReply(reply)
    ),
    vscode.commands.registerCommand("arv.resolveComment", (commentThread: vscode.CommentThread) =>
      commentProvider?.handleResolve(commentThread)
    ),
    vscode.commands.registerCommand("arv.reopenComment", (commentThread: vscode.CommentThread) =>
      commentProvider?.handleReopen(commentThread)
    ),
    vscode.commands.registerCommand("arv.markMustFix", (arg1: unknown, arg2?: unknown) => {
      if (!commentProvider) return;
      if (typeof arg1 === "string" && typeof arg2 === "string") {
        // From command URI: (repoRoot, threadId)
        commentProvider.handleToggleSeverityById(arg1, arg2, "must-fix");
      } else if (arg1 && typeof arg1 === "object") {
        // From title bar: CommentThread
        commentProvider.handleToggleSeverity(arg1 as vscode.CommentThread, "must-fix");
      }
    }),
    vscode.commands.registerCommand("arv.markComment", (arg1: unknown, arg2?: unknown) => {
      if (!commentProvider) return;
      if (typeof arg1 === "string" && typeof arg2 === "string") {
        commentProvider.handleToggleSeverityById(arg1, arg2, "comment");
      } else if (arg1 && typeof arg1 === "object") {
        commentProvider.handleToggleSeverity(arg1 as vscode.CommentThread, "comment");
      }
    }),

    // Bulk resolve
    vscode.commands.registerCommand("arv.bulkResolve", async () => {
      const bridge = manager!.getActiveBridge() ?? await manager!.pickBridge("Select repo");
      if (!bridge) return;

      const choice = await vscode.window.showQuickPick(
        [
          { label: "All open threads", filter: { status: "open" as const } },
          { label: "All addressed threads", filter: { status: "addressed" as const } },
          { label: "All threads in current file", filter: {} as { file?: string } },
          { label: "All unresolved threads", filter: {} },
        ],
        { placeHolder: "Which threads to resolve?" }
      );
      if (!choice) return;

      let filter = choice.filter;
      if (choice.label === "All threads in current file") {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage("No active editor.");
          return;
        }
        const pathMod = await import("node:path");
        const relPath = pathMod.relative(bridge.repoRoot, editor.document.uri.fsPath);
        filter = { file: relPath };
      }

      const resolved = bridge.bulkResolveThreads(filter);
      if (resolved.length === 0) {
        vscode.window.showInformationMessage("No matching threads to resolve.");
      } else {
        eventBus.emitThreadsChanged();
        vscode.window.showInformationMessage(`Resolved ${resolved.length} thread(s).`);
      }
    }),

    // Bulk resolve from tree view group node
    vscode.commands.registerCommand("arv.bulkResolveGroup", (node: any) => {
      if (!node || !node.status) return;
      const repoRoot = node.repoRoot;
      const bridge = repoRoot
        ? manager!.getAllBridges().get(repoRoot)
        : manager!.getActiveBridge();
      if (!bridge) return;

      const resolved = bridge.bulkResolveThreads({ status: node.status });
      if (resolved.length === 0) {
        vscode.window.showInformationMessage("No threads to resolve in this group.");
      } else {
        eventBus.emitThreadsChanged();
        vscode.window.showInformationMessage(`Resolved ${resolved.length} thread(s).`);
      }
    }),

    // End session
    vscode.commands.registerCommand("arv.endSession", async () => {
      const bridge = await manager!.pickBridge("Select repo to end session");
      if (!bridge) return;

      const confirm = await vscode.window.showWarningMessage(
        "End the current review session?",
        { modal: true },
        "End Session"
      );
      if (confirm !== "End Session") return;

      const session = bridge.endSession();
      if (session) {
        eventBus.emitSessionChanged();
        vscode.window.showInformationMessage("Review session ended.");
      } else {
        vscode.window.showErrorMessage("Failed to end session.");
      }
    })
  );

  // Disposables
  context.subscriptions.push({
    dispose: () => {
      treeProvider?.dispose();
      decorationProvider?.dispose();
      statusBarProvider?.dispose();
      commentProvider?.dispose();
      manager?.dispose();
      eventBus.removeAllListeners();
    },
  });
}

export function deactivate(): void {
  // Cleanup handled by subscriptions
}
