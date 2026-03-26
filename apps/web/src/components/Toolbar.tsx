import { useState, useRef, useEffect } from 'react'
import { ChevronDown, FileImage, FileCode, Link, Check } from 'lucide-react'
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
  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!exportOpen) return
    function onPointerDown(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [exportOpen])

  async function copyShareUrl() {
    const url = buildShareUrl(yaml)
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setExportOpen(false)
  }

  function handleExportPng() {
    onExportPng()
    setExportOpen(false)
  }

  function handleExportSvg() {
    onExportSvg()
    setExportOpen(false)
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

        {/* Export dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setExportOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand/80 transition-colors"
          >
            Export
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
          </button>

          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-md bg-gray-800 border border-gray-700 shadow-lg py-1 z-50">
              <button
                onClick={handleExportPng}
                data-export="png"
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <FileImage className="w-3.5 h-3.5 shrink-0" />
                Export PNG
                <span className="ml-auto text-gray-500">⌘S</span>
              </button>
              <button
                onClick={handleExportSvg}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <FileCode className="w-3.5 h-3.5 shrink-0" />
                Export SVG
              </button>
              <div className="my-1 border-t border-gray-700" />
              <button
                onClick={copyShareUrl}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Link className="w-3.5 h-3.5 shrink-0" />
                {copied ? 'Copied!' : 'Copy share link'}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Copy confirmation toast */}
      <div
        className={`fixed top-14 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-xs text-gray-200 shadow-lg transition-all duration-300 ${
          copied ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
        Link copied to clipboard
      </div>
    </header>
  )
}
