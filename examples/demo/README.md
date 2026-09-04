# Noxt demo hub

Single project exercising most Noxt features end to end.

## Run

From this directory (`examples/demo`):

```bash
bun install
bun run build     # prerender to .cache/ + dist/
bun run serve     # serve on http://localhost:3000
```

Or both at once with `bun run dev`. Variants:

```bash
NOXT_MODE=dev bun run build        # dev islands (sourcemaps, no minify)
NOXT_BASE=/demo bun run build      # base-path prefixing
PORT=3001 bun run serve            # custom port (reuse the same NOXT_BASE as the build)
```

## Feature checklist

| Feature | Where |
|---|---|
| Preact pages + `page()` / query | `src/pages/index.tsx`, `src/pages/blog/index.tsx` |
| Markdown, default layout | `src/pages/about.md` → `/about` |
| Markdown frontmatter + custom layout | `src/pages/docs/getting-started.md` → `/docs/getting-started` |
| Island SSR + `devalue` Date props | `Counter` on `/` |
| `sharedSignal` across instances | Two `LikeButton`s on `/` |
| Client `page()`/`asset()` in islands | `ThemeToggle` on `/` |
| `client:only` island | `Clock` on `/` |
| `useApi` + query types (string/array/number/boolean) | `SearchPosts` on `/` and `/blog` |
| `useFetchJson` GET + mutation POST | `Guestbook` on `/` |
| Query endpoint + 400 on bad params | `GET /api/posts`, try `/api/posts?limit=abc` |
| Mutation endpoint + 400, 201 status | `POST /api/guestbook` |
| Handler throw → 500 | `GET /api/crash` |
| Nested API route | `GET /api/admin/stats` |
| Assets + `asset()` + nested files | `logo.svg`, `nested/hero.svg` on `/` |
| Skipped files don't abort the build | `src/pages/broken-demo.ts`, `src/islands/old-helper.ts` (no default export) |
| Static output + PWA worker | `dist/`, `/sw.js` (registered on `/`) |

Generated artifacts: `.cache/` (pages, islands, `routes.json`, `utils.ts`, `api.ts`, `assets.ts`), `dist/`.
