import * as vscode from 'vscode'
import * as path from 'path'

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export class DiagramPanel {
  static current: DiagramPanel | undefined

  private readonly panel: vscode.WebviewPanel
  private readonly extensionUri: vscode.Uri
  sourceUri: vscode.Uri
  private readonly disposables: vscode.Disposable[] = []

  static createOrShow(extensionUri: vscode.Uri, document: vscode.TextDocument): void {
    const column = vscode.ViewColumn.Beside

    if (DiagramPanel.current) {
      DiagramPanel.current.panel.reveal(column)
      DiagramPanel.current.sourceUri = document.uri
      DiagramPanel.current.sendYaml(document)
      DiagramPanel.current.updateTitle(document)
      return
    }

    DiagramPanel.current = new DiagramPanel(extensionUri, document, column)
  }

  static update(document: vscode.TextDocument): void {
    if (DiagramPanel.current?.sourceUri.toString() === document.uri.toString()) {
      DiagramPanel.current.sendYaml(document)
    }
  }

  private constructor(
    extensionUri: vscode.Uri,
    document: vscode.TextDocument,
    column: vscode.ViewColumn,
  ) {
    this.extensionUri = extensionUri
    this.sourceUri = document.uri

    this.panel = vscode.window.createWebviewPanel(
      'fluxo.diagram',
      `fluxo: ${path.basename(document.fileName)}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
      },
    )

    this.panel.webview.html = this.buildHtml()

    // Send initial content after a short delay to allow webview to initialise
    setTimeout(() => this.sendYaml(document), 100)

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(
      (msg: { type: string; data?: string }) => {
        if (msg.type === 'export-svg' && msg.data) {
          void this.saveSvg(msg.data)
        }
      },
      null,
      this.disposables,
    )

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables)
  }

  private sendYaml(document: vscode.TextDocument): void {
    const yaml = document.getText()
    const theme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ? 'dark' : 'light'
    void this.panel.webview.postMessage({ type: 'update', yaml, theme })
  }

  private updateTitle(document: vscode.TextDocument): void {
    this.panel.title = `fluxo: ${path.basename(document.fileName)}`
  }

  private async saveSvg(svgData: string): Promise<void> {
    const uri = await vscode.window.showSaveDialog({
      filters: { 'SVG Image': ['svg'] },
      defaultUri: vscode.Uri.file(path.join(path.dirname(this.sourceUri.fsPath), 'pipeline.svg')),
    })
    if (!uri) return
    await vscode.workspace.fs.writeFile(uri, Buffer.from(svgData))
    void vscode.window.showInformationMessage(`Pipeline diagram saved to ${path.basename(uri.fsPath)}`)
  }

  private buildHtml(): string {
    const webview = this.panel.webview
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'),
    )
    // esbuild co-locates CSS with JS when CSS is imported
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.css'),
    )
    const nonce = getNonce()
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} data: blob:`,
    ].join('; ')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>fluxo</title>
  <link rel="stylesheet" href="${styleUri}" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100vh; width: 100vw; overflow: hidden; background: #0f172a; color: #f1f5f9; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`
  }

  private dispose(): void {
    DiagramPanel.current = undefined
    this.panel.dispose()
    for (const d of this.disposables) d.dispose()
    this.disposables.length = 0
  }
}
