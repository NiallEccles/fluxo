import yaml from 'js-yaml'
import type { CiFormat, Job, ParseError, Parser, Pipeline, Step } from './types.js'

const FORMAT: CiFormat = 'circleci'

function isCircleCiDoc(doc: unknown): boolean {
  if (typeof doc !== 'object' || doc === null) return false
  const d = doc as Record<string, unknown>
  return 'version' in d && ('jobs' in d || 'workflows' in d)
}

function parseSteps(rawSteps: unknown): Step[] {
  if (!Array.isArray(rawSteps)) return []
  return rawSteps.map((s) => {
    if (typeof s === 'string') return { name: s }
    if (typeof s !== 'object' || s === null) return { name: '(step)' }
    const step = s as Record<string, unknown>
    const key = Object.keys(step)[0] ?? '(step)'
    return { name: key, run: typeof step[key] === 'string' ? step[key] : undefined }
  })
}

export const circleciParser: Parser = {
  detect(doc: unknown): boolean {
    return isCircleCiDoc(doc)
  },

  parse(input: string): Pipeline {
    const errors: ParseError[] = []
    let doc: unknown

    try {
      doc = yaml.load(input)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { format: FORMAT, jobs: [], errors: [{ message }] }
    }

    if (!isCircleCiDoc(doc)) {
      return {
        format: FORMAT,
        jobs: [],
        errors: [{ message: 'Not a CircleCI config (missing version + jobs/workflows)' }],
      }
    }

    const d = doc as Record<string, unknown>
    const rawJobs = (d['jobs'] ?? {}) as Record<string, unknown>

    // Build job dependency map from workflows
    const needsMap: Record<string, string[]> = {}
    const workflows = (d['workflows'] ?? {}) as Record<string, unknown>
    for (const wf of Object.values(workflows)) {
      if (typeof wf !== 'object' || wf === null) continue
      const w = wf as Record<string, unknown>
      const jobsList = w['jobs']
      if (!Array.isArray(jobsList)) continue
      for (const entry of jobsList) {
        if (typeof entry === 'string') {
          needsMap[entry] ??= []
        } else if (typeof entry === 'object' && entry !== null) {
          const e = entry as Record<string, unknown>
          const jobName = Object.keys(e)[0]
          if (!jobName) continue
          const jobConfig = e[jobName] as Record<string, unknown> | undefined
          const requires = jobConfig?.['requires']
          needsMap[jobName] = Array.isArray(requires)
            ? requires.filter((r): r is string => typeof r === 'string')
            : []
        }
      }
    }

    const jobs: Job[] = []

    for (const [id, rawJob] of Object.entries(rawJobs)) {
      if (typeof rawJob !== 'object' || rawJob === null) {
        errors.push({ message: `Job "${id}" is not an object` })
        continue
      }
      const j = rawJob as Record<string, unknown>
      const executor = j['executor'] ?? j['docker'] ?? j['machine'] ?? j['macos']
      const runsOn =
        typeof executor === 'string'
          ? executor
          : typeof executor === 'object' && executor !== null
            ? String((executor as Record<string, unknown>)['image'] ?? 'unknown')
            : undefined

      jobs.push({
        id,
        name: id,
        needs: needsMap[id] ?? [],
        steps: parseSteps(j['steps']),
        runsOn,
        format: FORMAT,
      })
    }

    return { format: FORMAT, jobs, errors }
  },
}
