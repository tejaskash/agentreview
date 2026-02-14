import * as vscode from "vscode";
import path from "node:path";
import type { CoreBridge } from "../core-bridge.js";
import { buildThreadPanelHtml } from "../util/webview-html.js";
import { eventBus } from "../event-bus.js";

const openPanels = new Map<string, vscode.WebviewPanel>();

export async function openThreadPanel(
  bridge: CoreBridge,
  threadId: string,
  extensionPath: string
): Promise<void> {
  const thread = bridge.getThread(threadId);
  if (!thread) {
    vscode.window.showErrorMessage(`Thread ${threadId} not found.`);
    return;
  }

  // Navigate to file at anchor
  const filePath = path.join(bridge.repoRoot, thread.file);
  const doc = await vscode.workspace.openTextDocument(filePath);
  const startLine = Math.max(0, thread.anchor.startLine - 1);
  await vscode.window.showTextDocument(doc, {
    selection: new vscode.Range(
      startLine,
      0,
      thread.anchor.endLine - 1,
      0
    ),
    preserveFocus: true,
  });

  // Reuse existing panel if open
  const existing = openPanels.get(threadId);
  if (existing) {
    existing.reveal(vscode.ViewColumn.Beside);
    updatePanel(existing, bridge, threadId, extensionPath);
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "arvThread",
    `Thread ${threadId}`,
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(extensionPath, "media")),
      ],
    }
  );

  openPanels.set(threadId, panel);

  panel.onDidDispose(() => {
    openPanels.delete(threadId);
  });

  // Handle messages from webview
  panel.webview.onDidReceiveMessage(async (msg) => {
    switch (msg.type) {
      case "reply": {
        bridge.replyToThread(threadId, {
          message: msg.text,
          role: "human",
        });
        eventBus.emitThreadsChanged();
        updatePanel(panel, bridge, threadId, extensionPath);
        break;
      }
      case "reply-agent": {
        bridge.replyToThread(threadId, {
          message: msg.text,
          role: "agent",
        });
        eventBus.emitThreadsChanged();
        updatePanel(panel, bridge, threadId, extensionPath);
        break;
      }
      case "resolve": {
        bridge.resolveThread(threadId);
        eventBus.emitThreadsChanged();
        updatePanel(panel, bridge, threadId, extensionPath);
        break;
      }
      case "reopen": {
        bridge.reopenThread(threadId);
        eventBus.emitThreadsChanged();
        updatePanel(panel, bridge, threadId, extensionPath);
        break;
      }
    }
  });

  updatePanel(panel, bridge, threadId, extensionPath);
}

function updatePanel(
  panel: vscode.WebviewPanel,
  bridge: CoreBridge,
  threadId: string,
  extensionPath: string
): void {
  const thread = bridge.getThread(threadId);
  if (!thread) return;

  const cssUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, "media", "webview", "thread-panel.css"))
  );
  const jsUri = panel.webview.asWebviewUri(
    vscode.Uri.file(path.join(extensionPath, "media", "webview", "thread-panel.js"))
  );

  panel.webview.html = buildThreadPanelHtml(
    thread,
    panel.webview.cspSource,
    cssUri.toString(),
    jsUri.toString()
  );
}
