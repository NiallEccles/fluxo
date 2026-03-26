export const EXAMPLE_YAML = `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - name: Install dependencies
        run: pnpm install --frozen-lockfile

  lint:
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4
      - name: Lint
        run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4
      - name: Type check
        run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    needs: install
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: pnpm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: pnpm build

  deploy:
    runs-on: ubuntu-latest
    needs: build
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to GitHub Pages
        run: pnpm deploy
`
