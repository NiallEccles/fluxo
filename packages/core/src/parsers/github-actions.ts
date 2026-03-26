import yaml from 'js-yaml'
import type { CiFormat, Job, ParseError, Parser, Pipeline, Step } from './types.js'

const FORMAT: CiFormat = 'github-actions'

function isGitHubActionsDoc(doc: unknown): boolean {
  if (typeof doc !== 'object' || doc === null) return false
  const d = doc as Record<string, unknown>
  return 'on' in d || 'true' in d // 'on' is parsed as boolean `true` by some YAML parsers
}

function parseSteps(rawSteps: unknown): Step[] {
  if (!Array.isArray(rawSteps)) return []
  return rawSteps.map((s) => {
    if (typeof s !== 'object' || s === null) return { name: '(unknown step)' }
    const step = s as Record<string, unknown>
    return {
      name: typeof step['name'] === 'string' ? step['name'] : typeof step['uses'] === 'string' ? step['uses'] : typeof step['run'] === 'string' ? String(step['run']).split('\n')[0] : '(step)',
      run: typeof step['run'] === 'string' ? step['run'] : undefined,
      uses: typeof step['uses'] === 'string' ? step['uses'] : undefined,
    }
  })
}

function parseNeeds(raw: unknown): string[] {
  if (typeof raw === 'string') return [raw]
  if (Array.isArray(raw)) return raw.filter((n): n is string => typeof n === 'string')
  return []
}

export const githubActionsParser: Parser = {
  detect(doc: unknown): boolean {
    return isGitHubActionsDoc(doc)
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

    if (!isGitHubActionsDoc(doc)) {
      return {
        format: FORMAT,
        jobs: [],
        errors: [{ message: 'Not a GitHub Actions workflow (missing "on:" key)' }],
      }
    }

    const d = doc as Record<string, unknown>
    // 'on' becomes boolean true in YAML 1.1 — js-yaml uses YAML 1.2 so 'on' is fine
    const rawJobs = (d['jobs'] ?? {}) as Record<string, unknown>

    const jobs: Job[] = []

    for (const [id, rawJob] of Object.entries(rawJobs)) {
      if (typeof rawJob !== 'object' || rawJob === null) {
        errors.push({ message: `Job "${id}" is not an object` })
        continue
      }
      const j = rawJob as Record<string, unknown>

      jobs.push({
        id,
        name: typeof j['name'] === 'string' ? j['name'] : id,
        needs: parseNeeds(j['needs']),
        steps: parseSteps(j['steps']),
        runsOn: typeof j['runs-on'] === 'string' ? j['runs-on'] : undefined,
        format: FORMAT,
      })
    }

    const name = typeof d['name'] === 'string' ? d['name'] : undefined
    return { format: FORMAT, name, jobs, errors }
  },
}
