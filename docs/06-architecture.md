# Architecture

Noxt is designed around a **prerendered-first** philosophy: pages are rendered to static HTML at build time, and interactivity is added only where needed via client-side island components.

## Two-Phase Architecture

Noxt splits into two distinct phases that operate in different environments:

| Phase | Environment | What runs |
|-------|-------------|-----------|
| **Build time** | Bun (at `bun build` / macro execution) | `prepareRoutes()`, `prepareIsland()`, `preparePreact()`, `prepareMarkdown()` |
| **Runtime** | Bun server + Browser | `Bun.serve()` serves prerendered HTML; browser hydrates islands via `renderComponent()` |

Build-time code runs inside **Bun macros** (`import ... with { type: "macro" }`) and shell functions. The macro system lets Noxt scan the filesystem, prerender pages, and generate route maps at compile time — all before the server starts.

## Source Module Layout

```
src/
  core/        # Shared logic used by both build and runtime
    island.ts        # defineIsland, IslandComponent type, hashing, script generation
    code_generator.ts # Route map code generation
    rendering.ts     # HTML rendering, route name resolution, markdown parsing
  shell/       # Build-time only (filesystem, compilation, preparation)
    fs.ts            # File I/O and globbing
    island.ts        # prepareIsland — writes hydration scripts
    prepare.ts       # Page prerendering (Preact + Markdown)
    routes.ts        # prepareRoutes — orchestration macro
  runtime/     # Client/browser runtime
    fetch.ts         # useFetch hook
    render.ts        # Client-side island hydration (renderComponent)
```

## Build Pipeline

```
                     prepareRoutes() [macro]
                            |
                    Scan pages/ directory
                    (Bun.Glob: .ts,.tsx,.js,.jsx,.md)
                            |
                    For each file ─────────────────────┐
                            |                          |
                    ┌─── is .md? ───┐                  |
                    |               |                  |
              parseMarkdown()  import default export   |
              resolve layout   (Preact FunctionComponent)
              Bun.markdown     renderPageToHtml()
              renderMarkdownToHtml()                   |
                    |               |                  |
              write .cache/<name>.<hash>.html ◄────────┘
                            |
                    generateRouteMapCode(manifest)
                            |
                    write .cache/routes.js
```

The output `dist/` directory looks like:

```
dist/
  index.js            # Bundled server entry point
  .cache/
    routes.js         # Route map module
    Home.<hash>.html  # Prerendered HTML for /
    About.<hash>.html # Prerendered HTML for /about
    <hash>.js         # Hydration scripts for islands
```

## Server Startup

The bundled server imports the generated `.cache/routes.js` route map and passes it to `Bun.serve()`:

```
Bun.serve({ port: 3000, routes })
```

When a request comes in, Bun matches the URL against the route map and serves the prerendered HTML file directly — no per-request rendering. Unmatched routes return a 404.

## Island Architecture

Islands use a **placeholder + script** pattern:

```
Server prerenders:    <div data-island="<hash>" data-props="..."></div>
                      <script src=".cache/<hash>.js"></script>

Browser loads:        Script imports island component + renderComponent()
                      renderComponent() queries [data-island="<hash>"]
                      Renders Preact component INTO each matching div
                      (supports multiple instances per page)
```

The island's source module is imported directly in the generated script, so Bun's bundler includes it in the client bundle — but **only** the island code ships to the browser. The rest of the page stays as static HTML with no JavaScript overhead.

## Key Design Decisions

- **No framework CLI**: Noxt uses standard Bun commands (`bun run`, `bun build`, `bun test`) instead of a custom CLI
- **Macro-based build**: Bun's `with { type: "macro" }` allows build-time filesystem scanning and code generation without a separate build step
- **htm over JSX**: Tagged template literals avoid the need for a JSX transpiler while staying close to Preact's API
- **File-based routing with markdown support**: Both `.ts`/`.tsx` Preact pages and `.md` files with YAML frontmatter are first-class citizens
- **Deterministic hashing**: SHA-256 of component source / import path produces stable filenames for caching
