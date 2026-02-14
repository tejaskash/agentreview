import * as vscode from "vscode";
import { CoreBridge } from "./core-bridge.js";
import { eventBus } from "./event-bus.js";
import { getRepoRoot } from "./util/workspace.js";
import { ArvTreeProvider } from "./providers/tree-provider.js";
import { DecorationProvider } from "./providers/decoration-provider.js";
import { StatusBarProvider } from "./providers/status-bar.js";
import { FileWatcher } from "./watchers/file-watcher.js";
import { openThreadPanel } from "./panels/thread-panel.js";
import { initSession } from "./commands/init-session.js";
import { addThread } from "./commands/add-thread.js";
import { exportBundle } from "./commands/export-bundle.js";
import { applyPatchCommand } from "./commands/apply-patch.js";
import { showStatus } from "./commands/show-status.js";

let bridge: CoreBridge | undefined;
let treeProvider: ArvTreeProvider | undefined;
let decorationProvider: DecorationProvider | undefined;
let statusBarProvider: StatusBarProvider | undefined;
let fileWatcher: FileWatcher | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const repoRoot = getRepoRoot();
  if (!repoRoot) {
    // No workspace, register commands that show error
    context.subscriptions.push(
      vscode.commands.registerCommand("arv.initSession", () =>
        vscode.window.showErrorMessage("Open a workspace folder first.")
      )
    );
    return;
  }

  bridge = new CoreBridge(repoRoot);
  const extensionPath = context.extensionPath;

  // Providers
  treeProvider = new ArvTreeProvider(bridge);
  decorationProvider = new DecorationProvider(bridge, extensionPath);
  statusBarProvider = new StatusBarProvider(bridge);
  fileWatcher = new FileWatcher(repoRoot);

  // Register tree view
  const treeView = vscode.window.createTreeView("arvThreads", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Register hover provider
  const hoverDisposable = decorationProvider.registerHoverProvider();

  // Register commands
  context.subscriptions.push(
    treeView,
    hoverDisposable,
    vscode.commands.registerCommand("arv.initSession", () =>
      initSession(bridge!)
    ),
    vscode.commands.registerCommand("arv.addThread", () =>
      addThread(bridge!)
    ),
    vscode.commands.registerCommand("arv.exportBundle", () =>
      exportBundle(bridge!)
    ),
    vscode.commands.registerCommand("arv.applyPatch", () =>
      applyPatchCommand(bridge!)
    ),
    vscode.commands.registerCommand("arv.showStatus", () =>
      showStatus(bridge!)
    ),
    vscode.commands.registerCommand("arv.openThread", (threadId: string) =>
      openThreadPanel(bridge!, threadId, extensionPath)
    )
  );

  // Disposables
  context.subscriptions.push({
    dispose: () => {
      treeProvider?.dispose();
      decorationProvider?.dispose();
      statusBarProvider?.dispose();
      fileWatcher?.dispose();
      eventBus.removeAllListeners();
    },
  });
}

export function deactivate(): void {
  // Cleanup handled by subscriptions
}
