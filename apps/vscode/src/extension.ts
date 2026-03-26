import * as vscode from 'vscode'
import { DiagramPanel } from './DiagramPanel.js'
import { FluxoCodeLensProvider } from './CodeLensProvider.js'

export function activate(context: vscode.ExtensionContext): void {
  const visualizeCmd = vscode.commands.registerCommand('fluxo.visualize', () => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      void vscode.window.showWarningMessage('fluxo: No active editor. Open a CI YAML file first.')
      return
    }
    DiagramPanel.createOrShow(context.extensionUri, editor.document)
  })

  const codeLensProvider = vscode.languages.registerCodeLensProvider(
    [{ language: 'yaml' }, { pattern: '**/.github/workflows/*.yml' }],
    new FluxoCodeLensProvider(),
  )

  const saveWatcher = vscode.workspace.onDidSaveTextDocument((doc) => {
    DiagramPanel.update(doc)
  })

  // Also update on active editor change (live update without save)
  const changeWatcher = vscode.workspace.onDidChangeTextDocument((e) => {
    if (DiagramPanel.current?.sourceUri.toString() === e.document.uri.toString()) {
      DiagramPanel.update(e.document)
    }
  })

  context.subscriptions.push(visualizeCmd, codeLensProvider, saveWatcher, changeWatcher)
}

export function deactivate(): void {
  // DiagramPanel disposes itself via onDidDispose
}
