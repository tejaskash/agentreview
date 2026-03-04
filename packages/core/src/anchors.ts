import fs from "node:fs";
import path from "node:path";
import type { Anchor, Thread, ThreadsFile } from "./types.js";
import { loadThreads, saveThreads } from "./threads.js";

const CONTEXT_LINES = 3;

export function createAnchor(
  repoRoot: string,
  file: string,
  startLine: number,
  endLine: number
): Anchor {
  const filePath = path.join(repoRoot, file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${file}`);
  }

  const lines = fs.readFileSync(filePath, "utf-8").split("\n");

  // Convert to 0-indexed
  const start = startLine - 1;
  const end = endLine - 1;

  if (start < 0 || end >= lines.length || start > end) {
    throw new Error(
      `Invalid line range ${startLine}-${endLine} for file ${file} (${lines.length} lines)`
    );
  }

  const anchorText = lines.slice(start, end + 1).join("\n");

  const ctxBeforeStart = Math.max(0, start - CONTEXT_LINES);
  const ctxAfterEnd = Math.min(lines.length - 1, end + CONTEXT_LINES);

  const contextBefore = lines.slice(ctxBeforeStart, start).join("\n");
  const contextAfter = lines.slice(end + 1, ctxAfterEnd + 1).join("\n");

  return {
    startLine,
    endLine,
    contextBefore,
    anchorText,
    contextAfter,
  };
}

/**
 * Find the best match for anchorText in the file content.
 * Returns the 1-indexed start line, or -1 if not found.
 */
export function findAnchorInContent(
  fileContent: string,
  anchorText: string
): { startLine: number; endLine: number } | null {
  const lines = fileContent.split("\n");
  const anchorLines = anchorText.split("\n");

  // Exact match first
  for (let i = 0; i <= lines.length - anchorLines.length; i++) {
    const candidate = lines.slice(i, i + anchorLines.length).join("\n");
    if (candidate === anchorText) {
      return { startLine: i + 1, endLine: i + anchorLines.length };
    }
  }

  // Fuzzy match: find best LCS-based match
  let bestScore = 0;
  let bestStart = -1;

  for (let i = 0; i <= lines.length - anchorLines.length; i++) {
    const candidate = lines.slice(i, i + anchorLines.length).join("\n");
    const score = lcsLength(candidate, anchorText) / anchorText.length;
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  // Require at least 60% similarity
  if (bestScore >= 0.6 && bestStart >= 0) {
    return {
      startLine: bestStart + 1,
      endLine: bestStart + anchorLines.length,
    };
  }

  return null;
}

function lcsLength(a: string, b: string): number {
  // Optimized LCS for moderate-length strings
  const m = a.length;
  const n = b.length;

  // For very long strings, sample to keep it fast
  if (m > 2000 || n > 2000) {
    const sampleA = a.slice(0, 2000);
    const sampleB = b.slice(0, 2000);
    return lcsLengthImpl(sampleA, sampleB);
  }

  return lcsLengthImpl(a, b);
}

function lcsLengthImpl(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = new Uint16Array(n + 1);
  let curr = new Uint16Array(n + 1);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  return prev[n];
}

/**
 * Re-anchor all threads for files that were modified.
 * Returns lists of addressed and orphaned thread IDs.
 */
export function reanchorThreads(
  repoRoot: string,
  modifiedFiles: string[]
): { addressed: string[]; orphaned: string[] } {
  const data = loadThreads(repoRoot);
  const addressed: string[] = [];
  const orphaned: string[] = [];

  for (const thread of data.threads) {
    if (thread.status === "resolved") continue;
    if (!modifiedFiles.includes(thread.file)) continue;

    const filePath = path.join(repoRoot, thread.file);
    if (!fs.existsSync(filePath)) {
      thread.status = "orphaned";
      orphaned.push(thread.id);
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const match = findAnchorInContent(content, thread.anchor.anchorText);

    if (match) {
      const oldText = thread.anchor.anchorText;
      // Update anchor position
      thread.anchor.startLine = match.startLine;
      thread.anchor.endLine = match.endLine;

      // Update context
      const lines = content.split("\n");
      const start = match.startLine - 1;
      const end = match.endLine - 1;
      const ctxBeforeStart = Math.max(0, start - CONTEXT_LINES);
      const ctxAfterEnd = Math.min(lines.length - 1, end + CONTEXT_LINES);
      thread.anchor.contextBefore = lines.slice(ctxBeforeStart, start).join("\n");
      thread.anchor.contextAfter = lines.slice(end + 1, ctxAfterEnd + 1).join("\n");

      // Check if the anchor text itself changed (code was modified)
      const newAnchorText = lines.slice(start, end + 1).join("\n");
      if (newAnchorText !== oldText && thread.status === "open") {
        thread.status = "addressed";
        thread.anchor.anchorText = newAnchorText;
        addressed.push(thread.id);
      }
    } else {
      thread.status = "orphaned";
      orphaned.push(thread.id);
    }
  }

  saveThreads(repoRoot, data);
  return { addressed, orphaned };
}
