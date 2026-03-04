import * as vscode from "vscode";
import path from "node:path";
import type { BridgeManager } from "../bridge-manager.js";
import type { CoreBridge } from "../core-bridge.js";
import type { Severity, Thread } from "agentreview";
import { eventBus } from "../event-bus.js";

export class ArvCommentProvider {
  private controller: vscode.CommentController;
  /** Keyed by `${repoRoot}::${threadId}` */
  private commentThreads: Map<string, vscode.CommentThread> = new Map();
  /** Reverse map: VS Code CommentThread → { repoRoot, threadId } */
  private threadData: Map<vscode.CommentThread, { repoRoot: string; threadId: string }> = new Map();
  private disposables: vscode.Disposable[] = [];
  private hadSession = false;

  constructor(private manager: BridgeManager) {
    this.controller = this.createController();
    this.hadSession = this.hasAnySession();

    // Sync threads on startup and on changes
    this.syncThreads();
    eventBus.onThreadsChanged(() => this.syncThreads());
    eventBus.onSessionChanged(() => this.onSessionChanged());

    // Re-sync when active editor changes to pick up threads for newly opened files
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.syncThreads())
    );
  }

  private createController(): vscode.CommentController {
    const controller = vscode.comments.createCommentController(
      "arv-threads",
      "ARV Threads"
    );

    controller.commentingRangeProvider = {
      provideCommentingRanges: (document) => {
        const bridge = this.manager.getBridgeForFile(document.uri.fsPath);
        if (!bridge || !bridge.sessionExists()) return [];
        if (!document.uri.fsPath.startsWith(bridge.repoRoot)) return [];
        return [new vscode.Range(0, 0, document.lineCount - 1, 0)];
      },
    };

    controller.options = {
      placeHolder: "Add a review comment...",
      prompt: "Add a review comment...",
    };

    return controller;
  }

  private hasAnySession(): boolean {
    for (const bridge of this.manager.getAllBridges().values()) {
      if (bridge.sessionExists()) return true;
    }
    return false;
  }

  /**
   * When session state changes (created or ended), recreate the controller
   * so VS Code re-queries commentingRangeProvider for all open editors.
   */
  private onSessionChanged(): void {
    const hasSession = this.hasAnySession();
    if (hasSession !== this.hadSession) {
      this.hadSession = hasSession;
      // Dispose old threads and controller
      for (const ct of this.commentThreads.values()) {
        this.threadData.delete(ct);
        ct.dispose();
      }
      this.commentThreads.clear();
      this.controller.dispose();
      // Recreate
      this.controller = this.createController();
      this.syncThreads();
    }
  }

  private compositeKey(repoRoot: string, threadId: string): string {
    return `${repoRoot}::${threadId}`;
  }

  /** Look up thread identity from the reverse map */
  private getThreadData(ct: vscode.CommentThread): { repoRoot: string; threadId: string } | undefined {
    return this.threadData.get(ct);
  }

  syncThreads(): void {
    const activeKeys = new Set<string>();

    for (const [repoRoot, bridge] of this.manager.getAllBridges()) {
      const threads = bridge.listThreads();
      for (const arvThread of threads) {
        // Don't show resolved threads in the gutter
        if (arvThread.status === "resolved") continue;

        const key = this.compositeKey(repoRoot, arvThread.id);
        activeKeys.add(key);
        const existing = this.commentThreads.get(key);

        if (existing) {
          this.updateCommentThread(existing, arvThread);
        } else {
          this.createCommentThread(bridge, repoRoot, arvThread);
        }
      }
    }

    // Remove comment threads that no longer exist
    for (const [key, ct] of this.commentThreads) {
      if (!activeKeys.has(key)) {
        this.threadData.delete(ct);
        ct.dispose();
        this.commentThreads.delete(key);
      }
    }
  }

  private createCommentThread(bridge: CoreBridge, repoRoot: string, arvThread: Thread): void {
    const fileUri = vscode.Uri.file(
      path.join(bridge.repoRoot, arvThread.file)
    );
    const startLine = Math.max(0, arvThread.anchor.startLine - 1);
    const endLine = Math.max(0, arvThread.anchor.endLine - 1);
    const range = new vscode.Range(startLine, 0, endLine, 0);

    const commentThread = this.controller.createCommentThread(
      fileUri,
      range,
      this.buildComments(arvThread, repoRoot)
    );

    commentThread.label = this.buildLabel(arvThread);
    commentThread.contextValue = arvThread.severity;
    commentThread.canReply = true;
    commentThread.state = arvThread.status === "resolved"
      ? vscode.CommentThreadState.Resolved
      : vscode.CommentThreadState.Unresolved;

    const key = this.compositeKey(repoRoot, arvThread.id);
    this.commentThreads.set(key, commentThread);
    this.threadData.set(commentThread, { repoRoot, threadId: arvThread.id });
  }

  private updateCommentThread(
    commentThread: vscode.CommentThread,
    arvThread: Thread
  ): void {
    const data = this.threadData.get(commentThread);
    commentThread.comments = this.buildComments(arvThread, data?.repoRoot);
    commentThread.label = this.buildLabel(arvThread);
    commentThread.contextValue = arvThread.severity;
    commentThread.state = arvThread.status === "resolved"
      ? vscode.CommentThreadState.Resolved
      : vscode.CommentThreadState.Unresolved;
  }

  private buildLabel(arvThread: Thread): string {
    return arvThread.severity === "must-fix"
      ? `${arvThread.id} [must-fix]`
      : arvThread.id;
  }

  private buildComments(arvThread: Thread, repoRoot?: string): vscode.Comment[] {
    return arvThread.messages.map((msg, i) => {
      let bodyText = msg.body ?? "*(empty)*";

      // Inject severity badge into the first comment
      if (i === 0 && repoRoot) {
        bodyText = this.buildSeverityBadge(arvThread.severity, repoRoot, arvThread.id) + "\n\n" + bodyText;
      }

      const md = new vscode.MarkdownString(bodyText);
      md.supportThemeIcons = true;
      md.isTrusted = { enabledCommands: ["arv.markMustFix", "arv.markComment"] };

      return {
        author: {
          name: msg.role === "human" ? "Human" : "Agent",
        },
        body: md,
        mode: vscode.CommentMode.Preview,
        timestamp: new Date(msg.createdAt),
      };
    });
  }

  private buildSeverityBadge(severity: Severity, repoRoot: string, threadId: string): string {
    const args = encodeURIComponent(JSON.stringify([repoRoot, threadId]));
    if (severity === "must-fix") {
      return `**$(flame) must-fix** &nbsp; [change to comment](command:arv.markComment?${args})`;
    }
    return `**$(comment-discussion) comment** &nbsp; [change to must-fix](command:arv.markMustFix?${args})`;
  }

  /** Handle reply from the inline comment UI */
  async handleReply(reply: vscode.CommentReply): Promise<void> {
    const commentThread = reply.thread;
    const body = reply.text.trim();
    const data = this.getThreadData(commentThread);

    if (data) {
      // Reply to existing ARV thread
      const bridge = this.manager.getAllBridges().get(data.repoRoot);
      if (bridge) {
        bridge.replyToThread(data.threadId, {
          message: body,
          role: "human",
        });
        eventBus.emitThreadsChanged();
        return;
      }
    }

    // New thread creation from inline comment — default to "comment", no prompt
    const uri = commentThread.uri;
    const filePath = uri.fsPath;
    const bridge = this.manager.getBridgeForFile(filePath);
    if (!bridge) {
      vscode.window.showErrorMessage("Could not determine repository for this file.");
      commentThread.dispose();
      return;
    }

    const relPath = path.relative(bridge.repoRoot, filePath);
    const startLine = commentThread.range.start.line + 1;
    const endLine = commentThread.range.end.line + 1;

    const anchor = bridge.createAnchor(relPath, startLine, endLine);
    if (!anchor) {
      vscode.window.showErrorMessage("Could not create anchor for selection.");
      commentThread.dispose();
      return;
    }

    const thread = bridge.addThread({
      file: relPath,
      anchor,
      message: body,
      severity: "comment",
    });

    if (!thread) {
      vscode.window.showErrorMessage("Failed to create thread.");
      commentThread.dispose();
      return;
    }

    // Dispose the temp thread — syncThreads will recreate it with proper data
    commentThread.dispose();
    eventBus.emitThreadsChanged();
  }

  /** Resolve a thread from the inline comment UI */
  handleResolve(commentThread: vscode.CommentThread): void {
    const data = this.getThreadData(commentThread);
    if (!data) return;
    const bridge = this.manager.getAllBridges().get(data.repoRoot);
    if (!bridge) return;
    bridge.resolveThread(data.threadId);
    eventBus.emitThreadsChanged();
  }

  /** Reopen a resolved thread from the inline comment UI */
  handleReopen(commentThread: vscode.CommentThread): void {
    const data = this.getThreadData(commentThread);
    if (!data) return;
    const bridge = this.manager.getAllBridges().get(data.repoRoot);
    if (!bridge) return;
    bridge.reopenThread(data.threadId);
    eventBus.emitThreadsChanged();
  }

  /** Toggle severity on a comment thread (from title bar button) */
  handleToggleSeverity(commentThread: vscode.CommentThread, severity: Severity): void {
    const data = this.getThreadData(commentThread);
    if (!data) return;
    this.setSeverity(data.repoRoot, data.threadId, severity);
  }

  /** Toggle severity by thread identity (from command URI in comment body) */
  handleToggleSeverityById(repoRoot: string, threadId: string, severity: Severity): void {
    this.setSeverity(repoRoot, threadId, severity);
  }

  private setSeverity(repoRoot: string, threadId: string, severity: Severity): void {
    const bridge = this.manager.getAllBridges().get(repoRoot);
    if (!bridge) return;
    bridge.updateThreadSeverity(threadId, severity);
    eventBus.emitThreadsChanged();
  }

  /** Navigate to and reveal a specific thread */
  async revealThread(threadId: string, bridge?: CoreBridge): Promise<void> {
    // If bridge not provided, search all
    if (!bridge) {
      for (const b of this.manager.getAllBridges().values()) {
        const thread = b.getThread(threadId);
        if (thread) {
          bridge = b;
          break;
        }
      }
    }

    if (!bridge) {
      vscode.window.showErrorMessage(`Thread ${threadId} not found.`);
      return;
    }

    const thread = bridge.getThread(threadId);
    if (!thread) {
      vscode.window.showErrorMessage(`Thread ${threadId} not found.`);
      return;
    }

    const filePath = path.join(bridge.repoRoot, thread.file);
    const doc = await vscode.workspace.openTextDocument(filePath);
    const startLine = Math.max(0, thread.anchor.startLine - 1);
    await vscode.window.showTextDocument(doc, {
      selection: new vscode.Range(startLine, 0, thread.anchor.endLine - 1, 0),
    });
  }

  dispose(): void {
    for (const ct of this.commentThreads.values()) {
      this.threadData.delete(ct);
      ct.dispose();
    }
    this.commentThreads.clear();
    this.controller.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
