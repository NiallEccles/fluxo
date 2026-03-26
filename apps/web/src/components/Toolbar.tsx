import { buildShareUrl } from '../lib/url-state'
import type { CiFormat } from '@fluxo/core'

const FORMAT_LABEL: Record<CiFormat, string> = {
  'github-actions': 'GitHub Actions',
  'circleci': 'CircleCI',
  'gitlab-ci': 'GitLab CI',
  'unknown': 'Unknown',
}

interface ToolbarProps {
  format: CiFormat
  jobCount: number
  yaml: string
  onExportPng: () => void
  onExportSvg: () => void
  onLoadExample: () => void
  onFileUpload: (yaml: string) => void
}

export function Toolbar({ format, jobCount, yaml, onExportPng, onExportSvg, onLoadExample, onFileUpload }: ToolbarProps) {
  async function copyShareUrl() {
    const url = buildShareUrl(yaml)
    await navigator.clipboard.writeText(url)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) onFileUpload(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-brand tracking-tight">fluxo</span>
        {jobCount > 0 && (
          <span className="text-xs text-gray-400">
            {FORMAT_LABEL[format]} · {jobCount} job{jobCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onLoadExample}
          className="text-xs px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Example
        </button>

        <label className="text-xs px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer">
          Upload
          <input type="file" accept=".yml,.yaml" className="sr-only" onChange={handleFileInput} />
        </label>

        <div className="w-px h-4 bg-gray-700" />

        <button
          onClick={onExportPng}
          data-export="png"
          className="text-xs px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          title="Export PNG (⌘S)"
        >
          PNG
        </button>
        <button
          onClick={onExportSvg}
          className="text-xs px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          title="Export SVG"
        >
          SVG
        </button>
        <button
          onClick={copyShareUrl}
          className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand/80 transition-colors"
          title="Copy shareable URL"
        >
          Share
        </button>
      </div>
    </header>
  )
}
