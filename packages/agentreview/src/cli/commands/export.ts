import fs from "node:fs";
import chalk from "chalk";
import { generateExportBundle, saveRunRecord } from "../../core/export.js";

export async function exportCommand(
  repoRoot: string,
  opts: { output?: string }
): Promise<void> {
  const bundle = await generateExportBundle(repoRoot);
  const run = saveRunRecord(repoRoot, bundle);

  const json = JSON.stringify(bundle, null, 2);

  if (opts.output) {
    fs.writeFileSync(opts.output, json);
    console.log(
      chalk.green(`Export written to ${chalk.bold(opts.output)} (${run.id})`)
    );
  } else {
    console.log(json);
  }
}
