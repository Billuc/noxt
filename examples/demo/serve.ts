/**
 * Noxt demo hub — serve step.
 *
 * Run `bun run build.ts` first, then from this directory (`examples/demo`):
 *   bun run serve.ts                  # serve on http://localhost:3000
 *   PORT=3001 bun run serve.ts        # custom port
 *   NOXT_BASE=/demo bun run serve.ts  # same base as the build (for /sw.js)
 *
 * Routing uses the Bun.serve `routes` table: API method handlers plus static
 * responses for prerendered pages, island bundles, assets and the service
 * worker. `fetch` is only a fallback for dist/ pretty URLs and 404s.
 */
import { handlers } from "./.cache/api.ts";
import routeMap from "./.cache/routes.json" with { type: "json" };

const base = Bun.env.NOXT_BASE ?? "";
const port = Number(Bun.env.PORT ?? 3000);

const routes = Object.fromEntries(
  Object.entries(routeMap).map((e) => {
    return [e[0], new Response(Bun.file(e[1]))];
  }),
);

const server = Bun.serve({
  port,
  routes: {
    ...handlers,
    ...routes,
  },
  development: true,
});

console.log(
  `Demo serving at http://localhost:${port}${base} (${Object.keys(routes).length} routes)`,
);
