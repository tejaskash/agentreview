import type {
  Anchor,
  ExportBundle,
  RunRecord,
  Session,
  Severity,
  Thread,
  ThreadStatus,
  MessageRole,
} from "../../src/types.js";

import {
  sessionExists,
  createSession,
  loadSession,
  addToGitignore,
} from "../../src/core/session.js";

import {
  listThreads,
  addThread,
  getThread,
  replyToThread,
  resolveThread,
  reopenThread,
  updateThreadStatus,
} from "../../src/core/threads.js";

import { createAnchor, reanchorThreads } from "../../src/core/anchors.js";

import {
  isGitRepo,
  getCurrentBranch,
  getCommitHash,
  branchExists,
  checkPatch,
  applyPatch,
} from "../../src/core/git.js";

import {
  generateExportBundle,
  saveRunRecord,
} from "../../src/core/export.js";

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
