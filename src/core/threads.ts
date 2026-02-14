import fs from "node:fs";
import type {
  Thread,
  ThreadsFile,
  Message,
  Severity,
  ThreadStatus,
  MessageRole,
  Anchor,
} from "../types.js";
import { getThreadsPath } from "./session.js";

export function loadThreads(repoRoot: string): ThreadsFile {
  const threadsPath = getThreadsPath(repoRoot);
  if (!fs.existsSync(threadsPath)) {
    throw new Error("No threads file found. Run `arv init` first.");
  }
  return JSON.parse(fs.readFileSync(threadsPath, "utf-8"));
}

export function saveThreads(repoRoot: string, data: ThreadsFile): void {
  fs.writeFileSync(getThreadsPath(repoRoot), JSON.stringify(data, null, 2));
}

function nextThreadId(threads: Thread[]): string {
  if (threads.length === 0) return "t-1";
  const maxNum = Math.max(
    ...threads.map((t) => {
      const match = t.id.match(/^t-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );
  return `t-${maxNum + 1}`;
}

export function addThread(
  repoRoot: string,
  opts: {
    file: string;
    anchor: Anchor;
    message: string;
    severity?: Severity;
  }
): Thread {
  const data = loadThreads(repoRoot);
  const now = new Date().toISOString();

  const thread: Thread = {
    id: nextThreadId(data.threads),
    file: opts.file,
    severity: opts.severity ?? "comment",
    status: "open",
    anchor: opts.anchor,
    messages: [
      {
        role: "human",
        body: opts.message,
        createdAt: now,
      },
    ],
    createdAt: now,
  };

  data.threads.push(thread);
  saveThreads(repoRoot, data);
  return thread;
}

export function replyToThread(
  repoRoot: string,
  threadId: string,
  opts: {
    message: string;
    role?: MessageRole;
    status?: ThreadStatus;
  }
): Thread {
  const data = loadThreads(repoRoot);
  const thread = data.threads.find((t) => t.id === threadId);
  if (!thread) {
    throw new Error(`Thread ${threadId} not found.`);
  }

  const role = opts.role ?? "human";
  const msg: Message = {
    role,
    body: opts.message,
    createdAt: new Date().toISOString(),
  };
  thread.messages.push(msg);

  // Status side effects
  if (opts.status) {
    thread.status = opts.status;
  } else if (role === "human" && thread.status === "needs-human") {
    thread.status = "open";
  }

  saveThreads(repoRoot, data);
  return thread;
}

export function getThread(repoRoot: string, threadId: string): Thread | undefined {
  const data = loadThreads(repoRoot);
  return data.threads.find((t) => t.id === threadId);
}

export function listThreads(
  repoRoot: string,
  filters?: { status?: ThreadStatus; file?: string }
): Thread[] {
  const data = loadThreads(repoRoot);
  let threads = data.threads;

  if (filters?.status) {
    threads = threads.filter((t) => t.status === filters.status);
  }
  if (filters?.file) {
    threads = threads.filter((t) => t.file === filters.file);
  }

  return threads;
}

export function resolveThread(repoRoot: string, threadId: string): Thread {
  const data = loadThreads(repoRoot);
  const thread = data.threads.find((t) => t.id === threadId);
  if (!thread) throw new Error(`Thread ${threadId} not found.`);
  thread.status = "resolved";
  saveThreads(repoRoot, data);
  return thread;
}

export function reopenThread(repoRoot: string, threadId: string): Thread {
  const data = loadThreads(repoRoot);
  const thread = data.threads.find((t) => t.id === threadId);
  if (!thread) throw new Error(`Thread ${threadId} not found.`);
  thread.status = "open";
  saveThreads(repoRoot, data);
  return thread;
}

export function updateThreadStatus(
  repoRoot: string,
  threadId: string,
  status: ThreadStatus
): Thread {
  const data = loadThreads(repoRoot);
  const thread = data.threads.find((t) => t.id === threadId);
  if (!thread) throw new Error(`Thread ${threadId} not found.`);
  thread.status = status;
  saveThreads(repoRoot, data);
  return thread;
}
