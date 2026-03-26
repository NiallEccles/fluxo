import type { Job } from './parsers/types.js'

/**
 * Returns the set of job IDs that form the critical path — the longest chain
 * from a root job (no dependencies) to a leaf job (nothing depends on it).
 * "Longest" is measured in number of jobs (all jobs have equal weight).
 */
export function criticalPath(jobs: Job[]): Set<string> {
  if (jobs.length === 0) return new Set()

  const jobMap = new Map(jobs.map((j) => [j.id, j]))

  // dp[id] = length of longest path ending at id
  const dp = new Map<string, number>()
  // prev[id] = predecessor on that longest path
  const prev = new Map<string, string | null>()

  function longestTo(id: string): number {
    if (dp.has(id)) return dp.get(id)!
    const job = jobMap.get(id)
    if (!job || job.needs.length === 0) {
      dp.set(id, 1)
      prev.set(id, null)
      return 1
    }
    let best = 0
    let bestDep: string | null = null
    for (const dep of job.needs) {
      const len = longestTo(dep)
      if (len > best) {
        best = len
        bestDep = dep
      }
    }
    dp.set(id, best + 1)
    prev.set(id, bestDep)
    return best + 1
  }

  jobs.forEach((j) => longestTo(j.id))

  // Find the leaf job with the highest dp value
  let maxLen = 0
  let tail: string | null = null
  for (const job of jobs) {
    const len = dp.get(job.id) ?? 0
    if (len > maxLen) {
      maxLen = len
      tail = job.id
    }
  }

  // Trace back to root
  const path = new Set<string>()
  let cur: string | null = tail
  while (cur !== null && cur !== undefined) {
    path.add(cur)
    cur = prev.get(cur) ?? null
  }

  return path
}
