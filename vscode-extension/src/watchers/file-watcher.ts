import * as vscode from "vscode";
import { eventBus } from "../event-bus.js";

export class FileWatcher {
  private watcher: vscode.FileSystemWatcher;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(repoRoot: string) {
    const pattern = new vscode.RelativePattern(
      repoRoot,
      ".agentreview/{session.json,threads.json}"
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

    const onChange = () => this.debouncedRefresh();
    this.watcher.onDidChange(onChange);
    this.watcher.onDidCreate(onChange);
    this.watcher.onDidDelete(onChange);
  }

  private debouncedRefresh(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      eventBus.emitSessionChanged();
      eventBus.emitThreadsChanged();
    }, 300);
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.watcher.dispose();
  }
}
