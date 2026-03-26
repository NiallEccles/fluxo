import yaml from 'js-yaml'
import type { CiFormat, Job, ParseError, Parser, Pipeline, Step } from './types.js'

const FORMAT: CiFormat = 'gitlab-ci'

/** GitLab CI reserved top-level keys that are not job definitions */
const RESERVED_KEYS = new Set([
  'stages', 'variables', 'cache', 'before_script', 'after_script',
  'image', 'services', 'include', 'workflow', 'default',
])

function isGitLabCiDoc(doc: unknown): boolean {
  if (typeof doc !== 'object' || doc === null) return false
  const d = doc as Record<string, unknown>
  return 'stages' in d || Object.keys(d).some((k) => {
    if (RESERVED_KEYS.has(k)) return false
    const v = d[k]
    return typeof v === 'object' && v !== null && 'script' in (v as Record<string, unknown>)
  })
}

function parseScript(raw: unknown): Step[] {
  if (typeof raw === 'string') return [{ name: raw, run: raw }]
  if (Array.isArray(raw)) {
    return raw.map((line) => {
      const s = String(line)
      return { name: s.split('\n')[0], run: s }
    })
  }
  return []
}

export const gitlabCiParser: Parser = {
  detect(doc: unknown): boolean {
    return isGitLabCiDoc(doc)
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

    if (!isGitLabCiDoc(doc)) {
      return {
        format: FORMAT,
        jobs: [],
        errors: [{ message: 'Not a GitLab CI config' }],
      }
    }

    const d = doc as Record<string, unknown>
    const jobs: Job[] = []

    for (const [id, rawJob] of Object.entries(d)) {
      if (RESERVED_KEYS.has(id)) continue
      if (typeof rawJob !== 'object' || rawJob === null) continue
      const j = rawJob as Record<string, unknown>
      if (!('script' in j)) continue // not a job

      const needs = (() => {
        const n = j['needs']
        if (Array.isArray(n)) return n.map((x) => (typeof x === 'string' ? x : (x as Record<string,unknown>)['job'] as string)).filter(Boolean)
        return []
      })()

      const image = j['image']
      const runsOn = typeof image === 'string' ? image : typeof image === 'object' && image !== null ? String((image as Record<string,unknown>)['name'] ?? 'unknown') : undefined

      jobs.push({
        id,
        name: typeof j['name'] === 'string' ? j['name'] : id,
        needs,
        steps: parseScript(j['script']),
        runsOn,
        format: FORMAT,
      })
    }

    return { format: FORMAT, jobs, errors }
  },
}
