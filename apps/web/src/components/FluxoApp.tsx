import { useState, useEffect, useRef, useCallback } from 'react'
import { parsePipeline } from '@fluxo/core'
import type { Pipeline } from '@fluxo/core'
import { readYamlFromUrl, writeYamlToUrl } from '../lib/url-state'
import { EXAMPLE_YAML } from '../lib/example'
import { Editor } from './Editor'
import { Diagram } from './Diagram'
import type { DiagramHandle } from './Diagram'
import { Toolbar } from './Toolbar'

const DEBOUNCE_MS = 200

export default function FluxoApp() {
  const [yaml, setYaml] = useState<string>(() => {
    const fromUrl = readYamlFromUrl()
    return fromUrl ?? EXAMPLE_YAML
  })

  const [pipeline, setPipeline] = useState<Pipeline>(() => parsePipeline(yaml))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const diagramRef = useRef<DiagramHandle>(null)

  const handleYamlChange = useCallback((newYaml: string) => {
    setYaml(newYaml)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const parsed = parsePipeline(newYaml)
      setPipeline(parsed)
      writeYamlToUrl(newYaml)
    }, DEBOUNCE_MS)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 's') {
        e.preventDefault()
        diagramRef.current?.exportPng()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Drag-and-drop handlers
  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find((f) =>
      /\.ya?ml$/i.test(f.name),
    )
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text) handleYamlChange(text)
    }
    reader.readAsText(file)
  }

  const hasErrors = pipeline.errors.length > 0 && pipeline.jobs.length === 0

  return (
    <div className="flex flex-col h-screen" onDragOver={handleDragOver} onDrop={handleDrop}>
      <Toolbar
        format={pipeline.format}
        jobCount={pipeline.jobs.length}
        yaml={yaml}
        onExportPng={() => diagramRef.current?.exportPng()}
        onExportSvg={() => diagramRef.current?.exportSvg()}
        onLoadExample={() => handleYamlChange(EXAMPLE_YAML)}
        onFileUpload={handleYamlChange}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel */}
        <div className="w-[380px] shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
          {hasErrors && (
            <div className="px-3 py-2 bg-red-950 border-b border-red-800 text-red-300 text-xs">
              {pipeline.errors[0].message}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <Editor value={yaml} onChange={handleYamlChange} />
          </div>
        </div>

        {/* Diagram panel */}
        <div className="flex-1 overflow-hidden">
          {pipeline.jobs.length === 0 && !hasErrors ? (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm">
              Paste a CI YAML to see the diagram
            </div>
          ) : (
            <Diagram ref={diagramRef} jobs={pipeline.jobs} />
          )}
        </div>
      </div>
    </div>
  )
}
