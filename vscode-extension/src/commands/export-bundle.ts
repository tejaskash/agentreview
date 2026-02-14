import * as vscode from "vscode";
import type { CoreBridge } from "../core-bridge.js";

export async function exportBundle(bridge: CoreBridge): Promise<void> {
  if (!bridge.sessionExists()) {
    vscode.window.showErrorMessage("No review session found.");
    return;
  }

  const bundle = await bridge.generateExportBundle();
  if (!bundle) {
    vscode.window.showErrorMessage("Failed to generate export bundle.");
    return;
  }

  const record = bridge.saveRunRecord(bundle);

  const action = await vscode.window.showQuickPick(
    ["Copy to clipboard", "Save to file"],
    { placeHolder: "Export action" }
  );

  const json = JSON.stringify(bundle, null, 2);

  if (action === "Copy to clipboard") {
    await vscode.env.clipboard.writeText(json);
    vscode.window.showInformationMessage(
      `Export bundle copied (${bundle.threads.length} threads). Run: ${record?.id ?? "saved"}`
    );
  } else if (action === "Save to file") {
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file("arv-bundle.json"),
      filters: { JSON: ["json"] },
    } as any);
    if (uri) {
      await vscode.workspace.fs.writeFile(
        uri,
        new TextEncoder().encode(json)
      );
      vscode.window.showInformationMessage(
        `Export bundle saved to ${uri.fsPath}. Run: ${record?.id ?? "saved"}`
      );
    }
  }
}
