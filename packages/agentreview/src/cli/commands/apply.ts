import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import { checkPatch, applyPatch } from "../../core/git.js";
import { reanchorThreads } from "../../core/anchors.js";
import { loadRunRecords, updateRunRecord } from "../../core/export.js";
import { loadSession } from "../../core/session.js";

export async function applyCommand(
  repoRoot: string,
  patchFile: string,
  opts: { dryRun?: boolean }
): Promise<void> {
  const patchPath = path.resolve(patchFile);

  if (!fs.existsSync(patchPath)) {
    console.error(chalk.red(`Patch file not found: ${patchFile}`));
    process.exitCode = 1;
    return;
  }

  // Validate patch
  const check = await checkPatch(repoRoot, patchPath);
  if (!check.valid) {
    console.error(chalk.red("Patch validation failed:"));
    console.error(check.error);
    process.exitCode = 1;
    return;
  }

  if (opts.dryRun) {
    console.log(chalk.green("Patch is valid (dry run — not applied)."));
    return;
  }

  // Apply patch
  await applyPatch(repoRoot, patchPath);
  console.log(chalk.green("Patch applied successfully."));

  // Determine which files were modified by parsing the patch
  const patchContent = fs.readFileSync(patchPath, "utf-8");
  const modifiedFiles = extractFilesFromPatch(patchContent);

  // Re-anchor threads
  const result = reanchorThreads(repoRoot, modifiedFiles);

  if (result.addressed.length > 0) {
    console.log(
      chalk.cyan(`Threads marked as addressed: ${result.addressed.join(", ")}`)
    );
  }
  if (result.orphaned.length > 0) {
    console.log(
      chalk.yellow(`Threads orphaned (anchor lost): ${result.orphaned.join(", ")}`)
    );
  }

  // Update run record if one exists
  const runs = loadRunRecords(repoRoot);
  if (runs.length > 0) {
    const latestRun = runs[runs.length - 1];
    updateRunRecord(repoRoot, latestRun.id, {
      appliedAt: new Date().toISOString(),
      patchFile: patchFile,
      results: {
        applied: true,
        addressedThreads: result.addressed,
        orphanedThreads: result.orphaned,
      },
    });
  }
}

function extractFilesFromPatch(patch: string): string[] {
  const files = new Set<string>();
  const regex = /^(?:---|\+\+\+) [ab]\/(.+)$/gm;
  let match;
  while ((match = regex.exec(patch)) !== null) {
    files.add(match[1]);
  }
  return [...files];
}
