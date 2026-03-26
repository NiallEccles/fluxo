import type { NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import type { Job, CiFormat } from '@fluxo/core'

const FORMAT_COLORS: Record<CiFormat, string> = {
  'github-actions': 'border-violet-500',
  'circleci': 'border-green-500',
  'gitlab-ci': 'border-orange-500',
  'unknown': 'border-gray-500',
}

const FORMAT_BADGE: Record<CiFormat, string> = {
  'github-actions': 'bg-violet-900 text-violet-300',
  'circleci': 'bg-green-900 text-green-300',
  'gitlab-ci': 'bg-orange-900 text-orange-300',
  'unknown': 'bg-gray-800 text-gray-400',
}

interface JobNodeData {
  label: string
  job: Job
  isCritical?: boolean
}

export function JobNode({ data, selected }: NodeProps<{ data: JobNodeData }>) {
  const { job, isCritical } = data
  const borderColor = isCritical ? 'border-yellow-400' : FORMAT_COLORS[job.format]
  const ring = selected ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-950' : ''

  return (
    <div
      className={`
        relative bg-gray-900 border-2 ${borderColor} rounded-xl px-4 py-3 min-w-[160px] max-w-[220px]
        shadow-lg ${ring}
        ${isCritical ? 'shadow-yellow-500/20' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-600 !border-gray-500 !w-3 !h-3" />

      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-100 leading-tight break-words">{job.name}</p>
        {isCritical && (
          <span title="Critical path" className="text-yellow-400 text-xs mt-0.5 shrink-0">★</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {job.runsOn && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
            {job.runsOn}
          </span>
        )}
        {job.steps.length > 0 && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${FORMAT_BADGE[job.format]}`}>
            {job.steps.length} step{job.steps.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-gray-600 !border-gray-500 !w-3 !h-3" />
    </div>
  )
}
