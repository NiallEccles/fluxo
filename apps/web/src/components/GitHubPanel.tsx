import { useState, useEffect } from 'react'
import {
  listWorkflowFiles,
  fetchWorkflowContent,
  getStoredPat,
  storePat,
} from '../lib/github-fetch'

interface GitHubFile {
  name: string
  path: string
  download_url: string | null
  type: string
}

interface RateLimitInfo {
  remaining: number
  limit: number
  reset: Date
}

interface GitHubPanelProps {
  onYamlLoaded: (yaml: string) => void
}

export function GitHubPanel({ onYamlLoaded }: GitHubPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [repoUrl, setRepoUrl] = useState('')
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [files, setFiles] = useState<GitHubFile[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPat(getStoredPat())
  }, [])

  async function handleFetch() {
    if (!repoUrl.trim()) return
    setLoading(true)
    setError(null)
    setFiles([])
    setSelectedFile(null)
    try {
      const result = await listWorkflowFiles(repoUrl.trim(), pat || undefined)
      setFiles(result.files)
      setRateLimit(result.rateLimit)
      if (result.files.length === 0) {
        setError('No workflow YAML files found in .github/workflows')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleFileClick(file: GitHubFile) {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) {
      setError('Could not parse owner/repo from URL')
      return
    }
    const [, owner, repo] = match
    setSelectedFile(file.path)
    setLoading(true)
    setError(null)
    try {
      const yaml = await fetchWorkflowContent(owner, repo, file.path, pat || undefined)
      onYamlLoaded(yaml)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function handlePatChange(value: string) {
    setPat(value)
    storePat(value)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleFetch()
    }
  }

  return (
    <div className="border-b border-gray-800 bg-gray-900 shrink-0">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          GitHub
        </span>
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="text-gray-500 hover:text-gray-300 transition-colors p-0.5"
          aria-label={isOpen ? 'Collapse GitHub panel' : 'Expand GitHub panel'}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {/* URL input + Fetch button */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="github.com/owner/repo"
              className="flex-1 text-xs px-2 py-1.5 rounded bg-gray-800 text-gray-200 placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-brand min-w-0"
            />
            <button
              onClick={() => void handleFetch()}
              disabled={loading || !repoUrl.trim()}
              className="text-xs px-2.5 py-1.5 rounded bg-brand text-white hover:bg-brand/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? '…' : 'Fetch'}
            </button>
          </div>

          {/* PAT toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPat((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
            >
              PAT
            </button>
            {showPat && (
              <input
                type="password"
                value={pat}
                onChange={(e) => handlePatChange(e.target.value)}
                placeholder="ghp_…"
                className="flex-1 text-xs px-2 py-1 rounded bg-gray-800 text-gray-200 placeholder-gray-600 border border-gray-700 focus:outline-none focus:border-brand"
              />
            )}
            {rateLimit && (
              <span className="text-xs text-gray-500 ml-auto">
                API: {rateLimit.remaining}/{rateLimit.limit}
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-950 rounded px-2 py-1.5 break-words">
              {error}
            </p>
          )}

          {/* File list */}
          {files.length > 0 && (
            <ul className="space-y-0.5">
              {files.map((file) => (
                <li key={file.path}>
                  <button
                    onClick={() => void handleFileClick(file)}
                    className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors truncate ${
                      selectedFile === file.path
                        ? 'bg-brand/20 text-brand'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-gray-100'
                    }`}
                  >
                    {file.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
