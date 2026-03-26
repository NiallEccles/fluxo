import { useState, useEffect, useRef, useCallback } from 'react'
import { parsePipeline } from '@fluxo/core'
import type { Pipeline } from '@fluxo/core'
import { readYamlFromUrl, writeYamlToUrl } from '../lib/url-state'
import { EXAMPLE_YAML } from '../lib/example'
import { useResizable } from '../hooks/useResizable'
import { Editor } from './Editor'
import { Diagram } from './Diagram'
import type { DiagramHandle } from './Diagram'
import { ResizeHandle } from './ResizeHandle'
import { Toolbar } from './Toolbar'
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';

const DEBOUNCE_MS = 200

export default function FluxoApp() {
  const [yaml, setYaml] = useState<string>(() => {
    const fromUrl = readYamlFromUrl()
    return fromUrl ?? EXAMPLE_YAML
  })

  const [pipeline, setPipeline] = useState<Pipeline>(() => parsePipeline(yaml))
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const diagramRef = useRef<DiagramHandle>(null)

  const { width, isDragging, handlePointerDown, resetWidth } = useResizable({
    defaultWidth: 380,
    minWidth: 200,
    maxWidth: 600,
    storageKey: 'fluxo:editor-panel-width',
  })

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('fluxo:editor-panel-collapsed') === 'true'
  })

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem('fluxo:editor-panel-collapsed', String(next))
      return next
    })
  }

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
        <div
          className={`shrink-0 flex flex-col overflow-hidden ${!isDragging ? 'transition-[width] duration-200 ease-in-out' : ''}`}
          style={{ width: collapsed ? 0 : width }}
        >
          {hasErrors && (
            <div className="px-3 py-2 bg-red-950 border-b border-red-800 text-red-300 text-xs">
              {pipeline.errors[0].message}
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <Editor value={yaml} onChange={handleYamlChange} />
          </div>
        </div>

        {/* Resize handle */}
        <ResizeHandle
          onPointerDown={handlePointerDown}
          onDoubleClick={resetWidth}
          isDragging={isDragging}
          isCollapsed={collapsed}
          onToggleCollapse={toggleCollapse}
        />

        {/* Diagram panel */}
        <div className="flex-1 relative overflow-hidden">
          {pipeline.jobs.length === 0 && !hasErrors ? (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm">
              Paste a CI YAML to see the diagram
            </div>
          ) : (
            <>
              <div className='absolute w-8 z-10 top-10 left-0.5'>
                <button className='px-2 py-1.5 hover:bg-gray-800 rounded-full' onClick={toggleCollapse}>
                  {collapsed ? <PanelLeftOpen className='w-5 text-gray-500' /> : <PanelLeftClose className='w-5 text-gray-500' />}
                </button>
              </div>
              <Diagram ref={diagramRef} jobs={pipeline.jobs} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
