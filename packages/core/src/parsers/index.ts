import yaml from 'js-yaml'
import { githubActionsParser } from './github-actions.js'
import { circleciParser } from './circleci.js'
import { gitlabCiParser } from './gitlab-ci.js'
import type { CiFormat, Parser, Pipeline } from './types.js'

export type { CiFormat, Job, ParseError, Parser, Pipeline, Step } from './types.js'
export { githubActionsParser } from './github-actions.js'
export { circleciParser } from './circleci.js'
export { gitlabCiParser } from './gitlab-ci.js'

const PARSERS: Parser[] = [githubActionsParser, circleciParser, gitlabCiParser]

export function detectFormat(input: string): CiFormat {
  let doc: unknown
  try {
    doc = yaml.load(input)
  } catch {
    return 'unknown'
  }
  for (const p of PARSERS) {
    if (p.detect(doc)) return (p as Parser & { _format?: CiFormat })._format ?? 'unknown'
  }
  return 'unknown'
}

export function parsePipeline(input: string): Pipeline {
  let doc: unknown
  try {
    doc = yaml.load(input)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { format: 'unknown', jobs: [], errors: [{ message }] }
  }

  for (const p of PARSERS) {
    if (p.detect(doc)) return p.parse(input)
  }

  return {
    format: 'unknown',
    jobs: [],
    errors: [{ message: 'Could not detect CI format. Supported: GitHub Actions, CircleCI, GitLab CI' }],
  }
}
