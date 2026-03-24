# ADR-001 — Astro over Next.js

**Status:** Accepted
**Project:** fluxo

---

## Context

fluxo is a single-page, fully client-side tool. There are no server actions, no authentication, no database, and no dynamic routes. The only "server" concern is serving a static HTML file and its assets. Next.js is the most common React framework choice, but it carries significant server-side machinery that this project does not use.

---

## Options Considered

| Option | Static output | Client-side React | GitHub Pages friction | Config overhead |
|---|---|---|---|---|
| Next.js (`output: 'export'`) | Yes | Yes (full SPA) | Medium — needs `basePath`, `trailingSlash`, `assetPrefix` alignment | High |
| Astro + React island | Yes | Yes (`client:only`) | Low — official `withastro/action` handles it | Low |
| Vite + React (no framework) | Yes | Yes (full SPA) | Low | Medium |

---

## Decision

Use **Astro** with the `@astrojs/react` integration.

---

## Reasons

**1. No SPA routing problem.**
Astro outputs a real, pre-rendered `index.html`. GitHub Pages serves it as-is. Next.js with `output: 'export'` also produces static HTML, but its client-side navigation requires careful `basePath` and trailing-slash configuration to work correctly on GitHub Pages — a recurring source of subtle 404s in practice.

**2. Correct mental model for this app.**
The page shell (title, meta tags, OG image, fonts) is genuinely static and benefits from being pre-rendered. Only the editor and diagram are interactive. Astro's `client:only="react"` island expresses this split precisely. In Next.js, the entire page is a React component regardless of how much of it is actually interactive.

**3. Less configuration.**
No `next.config.js`, no App Router vs Pages Router decision, no `"use client"` directives to manage throughout the component tree. The Astro config is ~10 lines.

**4. Official deployment action.**
`withastro/action` handles the build and GitHub Pages upload in a single step with correct artifact handling and permissions. Next.js static export requires manually wiring `actions/upload-pages-artifact`, setting the `base` path, and remembering to add `.nojekyll`.

**5. Better SEO baseline.**
OG tags and the page title are in static HTML, not injected by React after hydration. Relevant for a tool that benefits from social sharing ("here's my pipeline diagram").

---

## Trade-offs

- **No type-safe URL search params.** TanStack Router provides these out of the box; with Astro the URL state is manual `URLSearchParams`. Acceptable — the logic is self-contained in `url-state.ts` and small enough to unit-test directly.
- **Astro's React integration adds a build step** that pure Vite + React does not. Negligible in practice.
- **Server-side features require migration.** If the project later needs an OAuth callback or URL shortening API, migrating to Next.js or adding a Cloudflare Worker is straightforward — all React components and core logic are framework-agnostic.

---

## Consequences

All React components are written as standard React — no Astro-specific APIs inside them. The `index.astro` page is a thin shell that mounts the app island. If this decision is ever reversed, only the page file changes.
