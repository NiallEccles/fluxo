import { useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react'
import { toPng, toSvg } from 'html-to-image'
import dagre from 'dagre'
import type { Job } from '@fluxo/core'
import { criticalPath } from '@fluxo/core'
import { JobNode } from './nodes/JobNode'
import '@xyflow/react/dist/style.css'

const NODE_WIDTH = 220
const NODE_HEIGHT = 80

const nodeTypes: NodeTypes = { job: JobNode as NodeTypes['job'] }

export interface DiagramHandle {
  exportPng(): Promise<void>
  exportSvg(): Promise<void>
}

interface DiagramProps {
  jobs: Job[]
}

function buildDagreLayout(jobs: Job[], critical: Set<string>): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 })

  for (const job of jobs) {
    g.setNode(job.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const job of jobs) {
    for (const dep of job.needs) {
      g.setEdge(dep, job.id)
    }
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
      style: critical.has(dep) && critical.has(job.id)
        ? { stroke: '#facc15', strokeWidth: 2 }
        : { stroke: '#4b5563', strokeWidth: 1.5 },
    }))
  )

  return { nodes, edges }
}

interface ExportControlsProps {
  exportRef: React.Ref<DiagramHandle>
  containerRef: React.RefObject<HTMLDivElement | null>
}

// Rendered inside ReactFlow so useReactFlow is available
function ExportControls({ exportRef, containerRef }: ExportControlsProps) {
  const { fitView, getViewport, setViewport } = useReactFlow()

  useImperativeHandle(exportRef, () => ({
    async exportPng() {
      const saved = getViewport()
      fitView({ padding: 0.15, duration: 0 })
      // Two rAFs: first lets React apply the new viewport, second lets the browser paint
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const el = containerRef.current
      if (!el) return
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: '#030712',
        filter: (node) => !['react-flow__controls', 'react-flow__minimap'].some(
          (cls) => (node as HTMLElement).classList?.contains(cls)
        ),
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'fluxo-pipeline.png'
      a.click()
      setViewport(saved, { duration: 0 })
    },
    async exportSvg() {
      const saved = getViewport()
      fitView({ padding: 0.15, duration: 0 })
      await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const el = containerRef.current
      if (!el) return
      const dataUrl = await toSvg(el, {
        backgroundColor: '#030712',
        filter: (node) => !['react-flow__controls', 'react-flow__minimap'].some(
          (cls) => (node as HTMLElement).classList?.contains(cls)
        ),
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'fluxo-pipeline.svg'
      a.click()
      setViewport(saved, { duration: 0 })
    },
  }), [fitView, getViewport, setViewport, containerRef])

  return null
}

export const Diagram = forwardRef<DiagramHandle, DiagramProps>(function Diagram({ jobs }, ref) {
  const critical = useMemo(() => criticalPath(jobs), [jobs])
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildDagreLayout(jobs, critical)
    setNodes(newNodes)
    setEdges(newEdges)
  }, [jobs, critical, setNodes, setEdges])

  return (
    <div ref={containerRef} className="relative h-full w-full bg-gray-950">
      <div className="absolute top-2 left-2 z-10 text-md font-semibold tracking-tight text-gray-500 pointer-events-none select-none">
        fluxo
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <ExportControls exportRef={ref} containerRef={containerRef} />
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#374151" />
        <Controls className="[&_button]:bg-gray-800 [&_button]:text-gray-300 [&_button]:border-gray-700" />
        <MiniMap
          nodeColor={(n) =>
            (n.data as { isCritical?: boolean }).isCritical ? '#facc15' : '#6366f1'
          }
          maskColor="rgba(0,0,0,0.6)"
          className="!bg-gray-900 !border-gray-700"
        />
      </ReactFlow>
    </div>
  )
})
