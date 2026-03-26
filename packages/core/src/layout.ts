import type { Job } from './parsers/types.js'

export interface LayoutNode {
  id: string
  position: { x: number; y: number }
  data: { label: string; job: Job }
}

export interface LayoutEdge {
  id: string
  source: string
  target: string
}

export interface LayoutResult {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 80
const H_GAP = 80
const V_GAP = 40

/**
 * Simple topological-rank layout.
 * Assigns each job a column (rank) based on its longest dependency chain,
 * then stacks jobs with the same rank vertically.
 *
 * In the web/extension apps this will be replaced by Dagre, but this pure-TS
 * implementation keeps @fluxo/core free of browser/Node dependencies.
 */
export function layout(jobs: Job[]): LayoutResult {
  const jobMap = new Map(jobs.map((j) => [j.id, j]))

  // Compute ranks via memoised recursion
  const rankCache = new Map<string, number>()

  function rank(id: string): number {
    if (rankCache.has(id)) return rankCache.get(id)!
    const job = jobMap.get(id)
    if (!job || job.needs.length === 0) {
      rankCache.set(id, 0)
      return 0
    }
    const r = 1 + Math.max(...job.needs.map(rank))
    rankCache.set(id, r)
    return r
  }

  jobs.forEach((j) => rank(j.id))

  // Group by rank
  const byRank = new Map<number, Job[]>()
  for (const job of jobs) {
    const r = rankCache.get(job.id) ?? 0
    if (!byRank.has(r)) byRank.set(r, [])
    byRank.get(r)!.push(job)
  }

  // Position nodes
  const nodes: LayoutNode[] = []
  for (const [r, rankJobs] of [...byRank.entries()].sort(([a], [b]) => a - b)) {
    const x = r * (NODE_WIDTH + H_GAP)
    rankJobs.forEach((job, i) => {
      const y = i * (NODE_HEIGHT + V_GAP)
      nodes.push({
        id: job.id,
        position: { x, y },
        data: { label: job.name, job },
      })
    })
  }

  // Build edges
  const edges: LayoutEdge[] = []
  for (const job of jobs) {
    for (const dep of job.needs) {
      edges.push({ id: `${dep}->${job.id}`, source: dep, target: job.id })
    }
  }

  return { nodes, edges }
}
