import React, { useState, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
  Handle,
  Position,
} from '@xyflow/react'
import dagre from 'dagre'
import { parsePipeline, criticalPath } from '@fluxo/core'
import type { Job, Pipeline, CiFormat } from '@fluxo/core'
import '@xyflow/react/dist/style.css'

// Acquire VS Code API for postMessage back to host
declare const acquireVsCodeApi: () => { postMessage: (msg: unknown) => void }
const vscode = acquireVsCodeApi()

const NODE_WIDTH = 200
const NODE_HEIGHT = 76

// Inline JobNode (can't import from web app)
function JobNode({ data }: { data: { label: string; job: Job; isCritical: boolean } }) {
  const { job, isCritical } = data
  const borderColors: Record<CiFormat, string> = {
    'github-actions': '#8b5cf6',
    circleci: '#22c55e',
    'gitlab-ci': '#f97316',
    unknown: '#6b7280',
  }
  const border = isCritical ? '#facc15' : (borderColors[job.format] ?? '#6b7280')

  return (
    <div
      style={{
        background: '#1e293b',
        border: `2px solid ${border}`,
        borderRadius: 12,
        padding: '10px 14px',
        minWidth: 160,
        maxWidth: 200,
        boxShadow: isCritical ? '0 0 12px rgba(250,204,21,0.2)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: '#475569', border: '1px solid #334155', width: 10, height: 10 }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', lineHeight: 1.3, wordBreak: 'break-word' }}>{job.name}</p>
        {isCritical && <span style={{ color: '#facc15', fontSize: 11, flexShrink: 0 }}>★</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {job.runsOn && (
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#0f172a', color: '#94a3b8', fontFamily: 'monospace' }}>
            {job.runsOn}
          </span>
        )}
        {job.steps.length > 0 && (
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#1e1b4b', color: '#a5b4fc' }}>
            {job.steps.length} step{job.steps.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#475569', border: '1px solid #334155', width: 10, height: 10 }} />
    </div>
  )
}

const nodeTypes: NodeTypes = { job: JobNode as NodeTypes['job'] }

function buildLayout(jobs: Job[], critical: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 })

  for (const job of jobs) g.setNode(job.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  for (const job of jobs) {
    for (const dep of job.needs) g.setEdge(dep, job.id)
  }
  dagre.layout(g)

  const nodes: Node[] = jobs.map((job) => {
    const pos = g.node(job.id)
    return {
      id: job.id,
      type: 'job',
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { label: job.name, job, isCritical: critical.has(job.id) },
    }
  })

  const edges: Edge[] = jobs.flatMap((job) =>
    job.needs.map((dep) => ({
      id: `${dep}->${job.id}`,
      source: dep,
      target: job.id,
      animated: critical.has(dep) && critical.has(job.id),
      style:
        critical.has(dep) && critical.has(job.id)
          ? { stroke: '#facc15', strokeWidth: 2 }
          : { stroke: '#475569', strokeWidth: 1.5 },
    })),
  )

  return { nodes, edges }
}

interface UpdateMessage {
  type: 'update'
  yaml: string
  theme?: 'dark' | 'light'
}

export function DiagramView() {
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    function onMessage(event: MessageEvent<UpdateMessage>) {
      const msg = event.data
      if (msg.type === 'update') {
        setPipeline(parsePipeline(msg.yaml))
        if (msg.theme) setTheme(msg.theme)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const critical = useMemo(() => (pipeline ? criticalPath(pipeline.jobs) : new Set<string>()), [pipeline])
  const { nodes, edges } = useMemo(
    () => (pipeline ? buildLayout(pipeline.jobs, critical) : { nodes: [], edges: [] }),
    [pipeline, critical],
  )

  const bg = theme === 'dark' ? '#0f172a' : '#f8fafc'
  const dotColor = theme === 'dark' ? '#1e293b' : '#cbd5e1'

  if (!pipeline) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  if (pipeline.errors.length > 0 && pipeline.jobs.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 }}>
        <p style={{ color: '#f87171', fontWeight: 600, fontSize: 14 }}>Parse error</p>
        <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', maxWidth: 400 }}>{pipeline.errors[0].message}</p>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', width: '100vw', background: bg, display: 'flex', flexDirection: 'column' }}>
      {/* Mini toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: 8, background: '#0f172a', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, color: '#6366f1', fontSize: 14, letterSpacing: '-0.02em' }}>fluxo</span>
        <span style={{ color: '#64748b', fontSize: 12 }}>
          {pipeline.format} · {pipeline.jobs.length} job{pipeline.jobs.length !== 1 ? 's' : ''}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            const svgEl = document.querySelector('.react-flow__renderer svg') as SVGElement | null
            if (svgEl) {
              const svgData = new XMLSerializer().serializeToString(svgEl)
              vscode.postMessage({ type: 'export-svg', data: svgData })
            }
          }}
          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', cursor: 'pointer' }}
        >
          Save SVG
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          attributionPosition="bottom-left"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={dotColor} />
          <Controls />
          <MiniMap
            nodeColor={(n) => ((n.data as { isCritical?: boolean }).isCritical ? '#facc15' : '#6366f1')}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
