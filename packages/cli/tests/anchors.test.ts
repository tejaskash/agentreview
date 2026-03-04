import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createAnchor, findAnchorInContent, reanchorThreads } from "agentreview/anchors";
import { createSession } from "agentreview/session";
import { addThread } from "agentreview/threads";
import { createTestRepo, cleanupTestRepo } from "./helpers.js";

describe("anchors", () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = createTestRepo();
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  it("should create an anchor with correct text and context", () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    expect(anchor.anchorText).toContain("if (user.password)");
    expect(anchor.startLine).toBe(4);
    expect(anchor.endLine).toBe(6);
    expect(anchor.contextBefore).toBeTruthy();
    expect(anchor.contextAfter).toBeTruthy();
  });

  it("should throw for non-existent file", () => {
    expect(() => createAnchor(repoRoot, "nope.ts", 1, 1)).toThrow(
      "File not found"
    );
  });

  it("should throw for invalid line range", () => {
    expect(() => createAnchor(repoRoot, "src/auth.ts", 0, 1)).toThrow(
      "Invalid line range"
    );
  });

  it("should find anchor text by exact match", () => {
    const content = "line1\nline2\nline3\nline4\nline5";
    const result = findAnchorInContent(content, "line2\nline3");
    expect(result).toEqual({ startLine: 2, endLine: 3 });
  });

  it("should find anchor by fuzzy match when slightly changed", () => {
    const content = "function login(user) {\n  if (user.pass) {\n    return true;\n  }\n  return false;\n}";
    const anchorText = "  if (user.password) {\n    return true;\n  }";
    const result = findAnchorInContent(content, anchorText);
    expect(result).not.toBeNull();
  });

  it("should return null when anchor cannot be found at all", () => {
    const content = "completely\ndifferent\ncontent";
    const result = findAnchorInContent(content, "nothing matches here at all");
    expect(result).toBeNull();
  });

  describe("reanchorThreads", () => {
    beforeEach(() => {
      createSession(repoRoot, {
        baseBranch: "main",
        baseCommit: "abc",
        headBranch: "feature-x",
        headCommit: "def",
      });
    });

    it("should mark thread as orphaned when file is deleted", () => {
      const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
      addThread(repoRoot, {
        file: "src/auth.ts",
        anchor,
        message: "Fix this",
        severity: "must-fix",
      });

      // Delete the file
      fs.unlinkSync(path.join(repoRoot, "src/auth.ts"));

      const result = reanchorThreads(repoRoot, ["src/auth.ts"]);
      expect(result.orphaned).toContain("t-1");
    });

    it("should mark thread as addressed when anchored code changes", () => {
      const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
      addThread(repoRoot, {
        file: "src/auth.ts",
        anchor,
        message: "Fix this",
        severity: "must-fix",
      });

      // Modify the anchored code
      const filePath = path.join(repoRoot, "src/auth.ts");
      const content = fs.readFileSync(filePath, "utf-8");
      const modified = content.replace(
        "if (user.password) {\n    return true;\n  }",
        "if (await bcrypt.compare(password, user.hash)) {\n    return true;\n  }"
      );
      fs.writeFileSync(filePath, modified);

      const result = reanchorThreads(repoRoot, ["src/auth.ts"]);
      expect(result.addressed).toContain("t-1");
    });
  });
});
