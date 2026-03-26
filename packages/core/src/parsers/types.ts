export type CiFormat = 'github-actions' | 'circleci' | 'gitlab-ci' | 'unknown'

export interface Step {
  name: string
  run?: string
  uses?: string
}

export interface Job {
  id: string
  name: string
  needs: string[]
  steps: Step[]
  runsOn?: string
  /** Original format this job came from */
  format: CiFormat
}

export interface Pipeline {
  format: CiFormat
  name?: string
  jobs: Job[]
  /** Raw parse errors, if any */
  errors: ParseError[]
}

export interface ParseError {
  message: string
  line?: number
}

export interface Parser {
  /** Returns true if this parser can handle the given YAML document */
  detect(doc: unknown): boolean
  parse(yaml: string): Pipeline
}
