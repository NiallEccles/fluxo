# ADR-002 — Monorepo over Separate Repositories

**Status:** Accepted
**Project:** fluxo

---

## Context

fluxo ships as two products: a web app and a VS Code extension. Both need the same CI parser logic, the same `Pipeline`/`Job` types, and the same Dagre layout function. The question is whether to keep them in a single repository or in two separate ones.

---

## Options Considered

**Option A — Two separate repos**
- `fluxo-web` — Astro app
- `fluxo-vscode` — VS Code extension
- Shared logic either duplicated in both, or extracted and published as a third `fluxo-core` npm package

**Option B — Monorepo (chosen)**
- `fluxo/` — single repo with pnpm workspaces
- `packages/core` — shared TypeScript library (`@fluxo/core`)
- `apps/web` — Astro app, depends on `@fluxo/core`
- `apps/vscode` — extension, depends on `@fluxo/core`

---

## Decision

Use a **pnpm workspace monorepo** with `packages/core` as a shared internal library.

---

## Reasons

**1. Single source of truth for shared logic.**
The GitHub Actions parser, CircleCI parser, `Pipeline` type, and Dagre layout wrapper are identical between the two products. With separate repos, a bug fix requires two PRs, two CI runs, and coordinated releases. With a monorepo, one PR fixes both.

**2. Type safety across the boundary.**
If the `Job` interface gains a new required field, TypeScript surfaces the error in both `apps/web` and `apps/vscode` in the same compile pass. With separate repos, the extension silently uses a stale type until the published package is updated and the extension's `package.json` is bumped.

**3. Atomic changes.**
A feature that affects the parser and both consumers (e.g. adding GitLab CI support) ships in a single PR with a single review and a single commit history entry. The full scope of the change is visible in one place.

**4. Simpler local development.**
`pnpm install` at the root installs everything. `pnpm --filter @fluxo/web dev` starts the web dev server with live changes from `core` reflected immediately — no `npm link` or `yalc` workarounds needed.

**5. One CI pipeline.**
A single `.github/workflows/ci.yml` runs `core` tests, then the web build, then the extension package step. The dependency order is explicit via `--filter` ordering, not implicit across repos that would need to coordinate release timing.

---

## Arguments Against (Considered and Rejected)

**"Separate repos keep concerns isolated."**
True in principle, but `core` is a pure TypeScript library with no framework dependency. It does not couple the web app and extension together beyond their shared data model — which they genuinely share by design.

**"Monorepos add tooling complexity."**
pnpm workspaces require minimal configuration (`pnpm-workspace.yaml` is three lines). There is no Turborepo or Nx involved. The project is small enough that explicit `--filter` commands in CI are sufficient.

**"Publishing `core` to npm is more reusable."**
A valid future option, but premature at v1. If third-party tooling wants to consume the parser, it can be extracted and published at that point. The monorepo does not prevent this — it makes the extraction easier because the library boundary already exists.

---

## Trade-offs

- `packages/core` must be built before either app. CI handles this with ordered `--filter` steps. Local development is handled automatically by pnpm workspace symlinks.
- All contributors need to understand the workspace structure. Mitigated by a clear root `README.md` with a diagram of the workspace layout.

---

## Consequences

- `packages/core` has its own `tsconfig.json` and `vitest` config — it is treated as a standalone library internally even though it is not published.
- If the two products diverge significantly in future, they can be split into separate repos. Because the library boundary already exists, the extraction is mechanical: publish `core` to npm, update the `package.json` in each repo, remove the workspace config.
