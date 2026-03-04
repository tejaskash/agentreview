export interface Anchor {
  startLine: number;
  endLine: number;
  contextBefore: string;
  anchorText: string;
  contextAfter: string;
}

export type Severity = "comment" | "must-fix";

export type ThreadStatus =
  | "open"
  | "needs-human"
  | "addressed"
  | "resolved"
  | "orphaned";

export type MessageRole = "human" | "agent";

export interface Message {
  role: MessageRole;
  body: string;
  createdAt: string;
}

export interface Thread {
  id: string;
  file: string;
  severity: Severity;
  status: ThreadStatus;
  anchor: Anchor;
  messages: Message[];
  createdAt: string;
}

export interface ThreadsFile {
  threads: Thread[];
}

export type SessionStatus = "active" | "completed";

export interface Session {
  version: string;
  baseBranch: string;
  baseCommit: string;
  headBranch: string;
  headCommit: string;
  createdAt: string;
  status: SessionStatus;
}

export interface RunRecord {
  id: string;
  exportedAt: string;
  appliedAt?: string;
  patchFile?: string;
  threadsSnapshot: Thread[];
  results?: {
    applied: boolean;
    addressedThreads: string[];
    orphanedThreads: string[];
  };
}

export interface ExportBundle {
  version: string;
  session: {
    baseBranch: string;
    headBranch: string;
    baseCommit: string;
    headCommit: string;
  };
  diff: string;
  threads: Thread[];
  prompt_hint: string;
}
