import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect } from 'vitest'
import { parsePipeline } from '../parsers/index.js'
import { criticalPath } from '../critical-path.js'
import { layout } from '../layout.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8')

describe('GitHub Actions parser', () => {
  const input = fixture('github-actions.yml')

  it('detects format', () => {
    const pipeline = parsePipeline(input)
    expect(pipeline.format).toBe('github-actions')
  })

  it('parses 4 jobs', () => {
    const pipeline = parsePipeline(input)
    expect(pipeline.jobs).toHaveLength(4)
    expect(pipeline.errors).toHaveLength(0)
  })

  it('parses job ids and names', () => {
    const pipeline = parsePipeline(input)
    const ids = pipeline.jobs.map((j) => j.id)
    expect(ids).toEqual(expect.arrayContaining(['lint', 'test', 'build', 'deploy']))
  })

  it('parses needs correctly', () => {
    const pipeline = parsePipeline(input)
    const build = pipeline.jobs.find((j) => j.id === 'build')!
    expect(build.needs).toEqual(expect.arrayContaining(['lint', 'test']))
  })

  it('parses runsOn', () => {
    const pipeline = parsePipeline(input)
    expect(pipeline.jobs[0].runsOn).toBe('ubuntu-latest')
  })

  it('parses steps', () => {
    const pipeline = parsePipeline(input)
    const lint = pipeline.jobs.find((j) => j.id === 'lint')!
    expect(lint.steps.length).toBeGreaterThan(0)
  })
})

describe('CircleCI parser', () => {
  const input = fixture('circleci.yml')

  it('detects format', () => {
    expect(parsePipeline(input).format).toBe('circleci')
  })

  it('parses 3 jobs', () => {
    const pipeline = parsePipeline(input)
    expect(pipeline.jobs).toHaveLength(3)
    expect(pipeline.errors).toHaveLength(0)
  })

  it('parses workflow dependencies', () => {
    const pipeline = parsePipeline(input)
    const test = pipeline.jobs.find((j) => j.id === 'test')!
    expect(test.needs).toContain('build')
    const deploy = pipeline.jobs.find((j) => j.id === 'deploy')!
    expect(deploy.needs).toContain('test')
  })
})

describe('GitLab CI parser', () => {
  const input = fixture('gitlab-ci.yml')

  it('detects format', () => {
    expect(parsePipeline(input).format).toBe('gitlab-ci')
  })

  it('parses 3 jobs', () => {
    const pipeline = parsePipeline(input)
    expect(pipeline.jobs).toHaveLength(3)
    expect(pipeline.errors).toHaveLength(0)
  })

  it('parses needs', () => {
    const pipeline = parsePipeline(input)
    const test = pipeline.jobs.find((j) => j.id === 'test-job')!
    expect(test.needs).toContain('build-job')
  })
})

describe('criticalPath', () => {
  it('returns the longest chain', () => {
    const pipeline = parsePipeline(fixture('github-actions.yml'))
    const cp = criticalPath(pipeline.jobs)
    // lint -> test -> build -> deploy (or lint -> build -> deploy)
    expect(cp.size).toBeGreaterThanOrEqual(3)
    expect(cp.has('deploy')).toBe(true)
  })

  it('handles empty input', () => {
    expect(criticalPath([])).toEqual(new Set())
  })
})

describe('layout', () => {
  it('produces a node for each job', () => {
    const pipeline = parsePipeline(fixture('github-actions.yml'))
    const result = layout(pipeline.jobs)
    expect(result.nodes).toHaveLength(pipeline.jobs.length)
  })

  it('produces edges for dependencies', () => {
    const pipeline = parsePipeline(fixture('github-actions.yml'))
    const result = layout(pipeline.jobs)
    expect(result.edges.length).toBeGreaterThan(0)
  })

  it('assigns unique positions', () => {
    const pipeline = parsePipeline(fixture('github-actions.yml'))
    const result = layout(pipeline.jobs)
    const positions = result.nodes.map((n) => `${n.position.x},${n.position.y}`)
    expect(new Set(positions).size).toBe(positions.length)
  })
})
