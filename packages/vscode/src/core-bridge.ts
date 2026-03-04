import type {
  Anchor,
  ExportBundle,
  RunRecord,
  Session,
  Severity,
  Thread,
  ThreadStatus,
  MessageRole,
} from "agentreview";

import {
  sessionExists,
  createSession,
  loadSession,
  endSession,
  addToGitignore,
} from "agentreview/session";

import {
  listThreads,
  addThread,
  getThread,
  replyToThread,
  resolveThread,
  reopenThread,
  updateThreadStatus,
  updateThreadSeverity,
  bulkResolveThreads,
} from "agentreview/threads";

import { createAnchor, reanchorThreads } from "agentreview/anchors";

import {
  isGitRepo,
  getCurrentBranch,
  getCommitHash,
  branchExists,
  checkPatch,
  applyPatch,
} from "agentreview/git";

import {
  generateExportBundle,
  saveRunRecord,
} from "agentreview/export";

export class CoreBridge {
  constructor(public repoRoot: string) {}

  // --- Session ---

  sessionExists(): boolean {
    try {
      return sessionExists(this.repoRoot);
    } catch {
      return false;
    }
  }

  loadSession(): Session | undefined {
    try {
      return loadSession(this.repoRoot);
    } catch {
      return undefined;
    }
  }

  createSession(opts: {
    baseBranch: string;
    baseCommit: string;
    headBranch: string;
    headCommit: string;
  }): Session | undefined {
    try {
      return createSession(this.repoRoot, opts);
    } catch {
      return undefined;
    }
  }

  endSession(): Session | undefined {
    try {
      return endSession(this.repoRoot);
    } catch {
      return undefined;
    }
  }

  addToGitignore(): void {
    try {
      addToGitignore(this.repoRoot);
    } catch {
      // ignore
    }
  }

  // --- Git ---

  async isGitRepo(): Promise<boolean> {
    try {
      return await isGitRepo(this.repoRoot);
    } catch {
      return false;
    }
  }

  async getCurrentBranch(): Promise<string | undefined> {
    try {
      return await getCurrentBranch(this.repoRoot);
    } catch {
      return undefined;
    }
  }

  async getCommitHash(ref: string): Promise<string | undefined> {
    try {
      return await getCommitHash(this.repoRoot, ref);
    } catch {
      return undefined;
    }
  }

  async branchExists(branch: string): Promise<boolean> {
    try {
      return await branchExists(this.repoRoot, branch);
    } catch {
      return false;
    }
  }

  async checkPatch(patchPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      return await checkPatch(this.repoRoot, patchPath);
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async applyPatch(patchPath: string): Promise<void> {
    return await applyPatch(this.repoRoot, patchPath);
  }

  // --- Threads ---

  listThreads(filters?: { status?: ThreadStatus; file?: string }): Thread[] {
    try {
      return listThreads(this.repoRoot, filters);
    } catch {
      return [];
    }
  }

  getThread(threadId: string): Thread | undefined {
    try {
      return getThread(this.repoRoot, threadId);
    } catch {
      return undefined;
    }
  }

  addThread(opts: {
    file: string;
    anchor: Anchor;
    message: string;
    severity?: Severity;
  }): Thread | undefined {
    try {
      return addThread(this.repoRoot, opts);
    } catch {
      return undefined;
    }
  }

  replyToThread(
    threadId: string,
    opts: { message: string; role?: MessageRole; status?: ThreadStatus }
  ): Thread | undefined {
    try {
      return replyToThread(this.repoRoot, threadId, opts);
    } catch {
      return undefined;
    }
  }

  resolveThread(threadId: string): Thread | undefined {
    try {
      return resolveThread(this.repoRoot, threadId);
    } catch {
      return undefined;
    }
  }

  reopenThread(threadId: string): Thread | undefined {
    try {
      return reopenThread(this.repoRoot, threadId);
    } catch {
      return undefined;
    }
  }

  updateThreadStatus(threadId: string, status: ThreadStatus): Thread | undefined {
    try {
      return updateThreadStatus(this.repoRoot, threadId, status);
    } catch {
      return undefined;
    }
  }

  updateThreadSeverity(threadId: string, severity: Severity): Thread | undefined {
    try {
      return updateThreadSeverity(this.repoRoot, threadId, severity);
    } catch {
      return undefined;
    }
  }

  bulkResolveThreads(filter?: { status?: ThreadStatus; file?: string }): Thread[] {
    try {
      return bulkResolveThreads(this.repoRoot, filter);
    } catch {
      return [];
    }
  }

  // --- Anchors ---

  createAnchor(file: string, startLine: number, endLine: number): Anchor | undefined {
    try {
      return createAnchor(this.repoRoot, file, startLine, endLine);
    } catch {
      return undefined;
    }
  }

  reanchorThreads(modifiedFiles: string[]): { addressed: string[]; orphaned: string[] } {
    try {
      return reanchorThreads(this.repoRoot, modifiedFiles);
    } catch {
      return { addressed: [], orphaned: [] };
    }
  }

  // --- Export ---

  async generateExportBundle(): Promise<ExportBundle | undefined> {
    try {
      return await generateExportBundle(this.repoRoot);
    } catch {
      return undefined;
    }
  }

  saveRunRecord(bundle: ExportBundle): RunRecord | undefined {
    try {
      return saveRunRecord(this.repoRoot, bundle);
    } catch {
      return undefined;
    }
  }
}
