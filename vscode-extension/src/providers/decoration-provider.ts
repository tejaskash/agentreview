import * as vscode from "vscode";
import path from "node:path";
import type { CoreBridge } from "../core-bridge.js";
import type { Thread, ThreadStatus } from "../../../src/types.js";
import { eventBus } from "../event-bus.js";

const DECORATION_CONFIGS: Record<
  ThreadStatus,
  { color: string; icon: string }
> = {
  open: { color: "#e2b340", icon: "thread-open.svg" },
  "needs-human": { color: "#4dabf7", icon: "thread-needs-human.svg" },
  addressed: { color: "#69db7c", icon: "thread-addressed.svg" },
  resolved: { color: "#69db7c", icon: "thread-resolved.svg" },
  orphaned: { color: "#ff6b6b", icon: "thread-orphaned.svg" },
};

export class DecorationProvider {
  private decorationTypes: Map<ThreadStatus, vscode.TextEditorDecorationType> =
    new Map();
  private disposables: vscode.Disposable[] = [];

  constructor(
    private bridge: CoreBridge,
    private extensionPath: string
  ) {
    // Create decoration types for each status
    for (const [status, config] of Object.entries(DECORATION_CONFIGS)) {
      const iconPath = path.join(extensionPath, "media", "icons", config.icon);
      const decorationType = vscode.window.createTextEditorDecorationType({
        gutterIconPath: iconPath,
        gutterIconSize: "80%",
        overviewRulerColor: config.color,
        overviewRulerLane: vscode.OverviewRulerLane.Right,
      });
      this.decorationTypes.set(status as ThreadStatus, decorationType);
    }

    // Subscribe to editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.updateDecorations())
    );
    eventBus.onThreadsChanged(() => this.updateDecorations());

    // Initial decoration
    this.updateDecorations();
  }

  updateDecorations(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const filePath = editor.document.uri.fsPath;
    const repoRoot = this.bridge.repoRoot;

    // Get relative path
    let relPath: string;
    if (filePath.startsWith(repoRoot)) {
      relPath = path.relative(repoRoot, filePath);
    } else {
      // Clear all decorations if file is outside repo
      for (const decorationType of this.decorationTypes.values()) {
        editor.setDecorations(decorationType, []);
      }
      return;
    }

    const threads = this.bridge.listThreads({ file: relPath });

    // Group threads by status
    const byStatus = new Map<ThreadStatus, Thread[]>();
    for (const thread of threads) {
      const list = byStatus.get(thread.status) ?? [];
      list.push(thread);
      byStatus.set(thread.status, list);
    }

    // Apply decorations per status
    for (const [status, decorationType] of this.decorationTypes.entries()) {
      const statusThreads = byStatus.get(status) ?? [];
      const ranges = statusThreads.map((t) => {
        // Anchor lines are 1-indexed, VS Code is 0-indexed
        const startLine = t.anchor.startLine - 1;
        const endLine = t.anchor.endLine - 1;
        return new vscode.Range(startLine, 0, endLine, 0);
      });
      editor.setDecorations(decorationType, ranges);
    }
  }

  registerHoverProvider(): vscode.Disposable {
    return vscode.languages.registerHoverProvider(
      { scheme: "file" },
      {
        provideHover: (document, position) => {
          const filePath = document.uri.fsPath;
          const repoRoot = this.bridge.repoRoot;
          if (!filePath.startsWith(repoRoot)) return undefined;

          const relPath = path.relative(repoRoot, filePath);
          const threads = this.bridge.listThreads({ file: relPath });
          const line = position.line + 1; // Convert to 1-indexed

          const matchingThreads = threads.filter(
            (t) => line >= t.anchor.startLine && line <= t.anchor.endLine
          );

          if (matchingThreads.length === 0) return undefined;

          const md = new vscode.MarkdownString();
          md.isTrusted = true;
          for (const t of matchingThreads) {
            md.appendMarkdown(
              `**${t.id}** [${t.severity}] — *${t.status}*\n\n`
            );
            md.appendMarkdown(`${t.messages[0]?.body ?? ""}\n\n`);
            md.appendMarkdown(
              `[View Thread](command:arv.openThread?${encodeURIComponent(JSON.stringify(t.id))})\n\n---\n\n`
            );
          }
          return new vscode.Hover(md);
        },
      }
    );
  }

  dispose(): void {
    for (const decorationType of this.decorationTypes.values()) {
      decorationType.dispose();
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
