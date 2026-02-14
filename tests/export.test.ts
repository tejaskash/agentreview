import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateExportBundle, saveRunRecord, loadRunRecords } from "../src/core/export.js";
import { createSession } from "../src/core/session.js";
import { addThread } from "../src/core/threads.js";
import { createAnchor } from "../src/core/anchors.js";
import { createTestRepo, cleanupTestRepo } from "./helpers.js";

describe("export", () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = createTestRepo();
    createSession(repoRoot, {
      baseBranch: "main",
      baseCommit: "abc123",
      headBranch: "feature-x",
      headCommit: "def456",
    });
  });

  afterEach(() => {
    cleanupTestRepo(repoRoot);
  });

  it("should generate a valid export bundle", async () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "Fix password validation",
      severity: "must-fix",
    });

    const bundle = await generateExportBundle(repoRoot);

    expect(bundle.version).toBe("1");
    expect(bundle.session.baseBranch).toBe("main");
    expect(bundle.session.headBranch).toBe("feature-x");
    expect(bundle.diff).toContain("diff --git");
    expect(bundle.threads).toHaveLength(1);
    expect(bundle.threads[0].id).toBe("t-1");
    expect(bundle.prompt_hint).toContain("feature-x");
    expect(bundle.prompt_hint).toContain("arv thread reply");
  });

  it("should filter out resolved threads from export", async () => {
    const anchor = createAnchor(repoRoot, "src/auth.ts", 4, 6);
    addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "Fix this",
    });
    addThread(repoRoot, {
      file: "src/auth.ts",
      anchor,
      message: "Also fix this",
    });

    // Resolve thread t-1
    const { resolveThread } = await import("../src/core/threads.js");
    resolveThread(repoRoot, "t-1");

    const bundle = await generateExportBundle(repoRoot);
    expect(bundle.threads).toHaveLength(1);
    expect(bundle.threads[0].id).toBe("t-2");
  });

  it("should save and load run records", async () => {
    const bundle = await generateExportBundle(repoRoot);
    const record = saveRunRecord(repoRoot, bundle);

    expect(record.id).toBe("run-001");
    expect(record.exportedAt).toBeTruthy();

    const records = loadRunRecords(repoRoot);
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("run-001");
  });

  it("should increment run numbers", async () => {
    const bundle = await generateExportBundle(repoRoot);
    saveRunRecord(repoRoot, bundle);
    const r2 = saveRunRecord(repoRoot, bundle);
    expect(r2.id).toBe("run-002");
  });
});
