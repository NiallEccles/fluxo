import * as vscode from 'vscode'

export class FluxoCodeLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lines = document.getText().split('\n')

    // GitHub Actions: look for top-level 'on:' key
    let lineNum = lines.findIndex((l) => /^on:/.test(l))
    // CircleCI: 'version:' at top
    if (lineNum < 0) lineNum = lines.findIndex((l) => /^version:/.test(l))
    // GitLab CI: 'stages:' at top
    if (lineNum < 0) lineNum = lines.findIndex((l) => /^stages:/.test(l))
    // Fallback: first line
    if (lineNum < 0) lineNum = 0

    const range = new vscode.Range(lineNum, 0, lineNum, 0)
    return [
      new vscode.CodeLens(range, {
        title: '$(graph) View Pipeline Diagram',
        command: 'fluxo.visualize',
        tooltip: 'Open an interactive pipeline diagram in a side panel',
      }),
    ]
  }
}
