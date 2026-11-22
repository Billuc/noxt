# Agent Instructions

## Project overview

Noxt is a TypeScript web framework with prerendering and Preact islands. Source code lives in `src/`, tests live in `tests/`, and the runnable demo is in `examples/demo/`.

## Goals

- Maintain fullstack type safety across server, rendering, islands, APIs, and client code.
- Keep generated scripts and client-side bundles minimal.

## Setup

- Install dependencies with `npm install`.
- Bun remains available for local setup and commands, but Noxt is no longer based on Bun.
- Use npm and Node for CI and Node-compatible tooling.
- Do not introduce pnpm-specific files.
- The root `tsconfig.json` type checks the framework with strict TypeScript settings and excludes `examples/` and `node_modules/`.

## Common commands

- `npm test` - Run the full test suite.
- `tsc --noEmit` - Run the strict TypeScript type check.
- `bun run index.ts` - Start the development server.
- `bun run build --target=bun --outdir=dist index.ts` - Create a production bundle.

Run targeted tests during development (for example, `npm test -- tests/unit/core/url.test.ts`) and run `npm test` before completing a change.

## Repository structure

- `src/api/`, `src/core/`, `src/ssr/`, and the other `src/*/` directories contain framework features.
- `src/islands/` and `src/preact/` contain client and Preact integration code.
- `tests/unit/` verifies individual modules, `tests/integration/` verifies build behavior, and `tests/e2e/` verifies complete framework flows.
- `examples/demo/` is an executable integration example; keep it working when framework behavior changes.
- Public exports and entry points are declared in `index.ts`, `src/*/index.ts`, and `package.json`.

## Change guidelines

- Keep changes focused and preserve the existing TypeScript, ESM, and Preact patterns.
- Match the formatting and naming style of nearby code. Use two or four spaces consistently within the file being edited.
- Keep functions small and focused.
- Comments are forbidden. Explain behavior through clear code and documentation.
- JSDoc for functions is encouraged, especially for exported functions and non-obvious APIs.
- Update README or documentation under `docs/` when behavior or public usage changes.
- Add or update the smallest relevant test for a behavior change. Prefer an existing test file and its established style.
- Do not update `bun.lock` unless dependencies actually change.

## Validation

Before finishing:

1. Run `tsc --noEmit`.
2. Run relevant targeted tests.
3. Run `npm test` for substantive framework or cross-module changes.
4. Inspect `git diff` and ensure no generated build artifacts or unrelated files are included.
