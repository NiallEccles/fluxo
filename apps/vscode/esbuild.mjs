import esbuild from 'esbuild'

const watch = process.argv.includes('--watch')

const sharedOptions = {
  bundle: true,
  sourcemap: true,
  minify: false,
  logLevel: 'info',
}

// Extension host: CJS, Node, vscode external
const extensionCtx = await esbuild.context({
  ...sharedOptions,
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
})

// Webview bundle: IIFE, browser
const webviewCtx = await esbuild.context({
  ...sharedOptions,
  entryPoints: ['src/webview/index.tsx'],
  outfile: 'dist/webview.js',
  format: 'iife',
  platform: 'browser',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
})

if (watch) {
  await extensionCtx.watch()
  await webviewCtx.watch()
  console.log('Watching...')
} else {
  await extensionCtx.rebuild()
  await extensionCtx.dispose()
  await webviewCtx.rebuild()
  await webviewCtx.dispose()
}
