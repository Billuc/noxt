import { staticPrerender } from "noxt";

const routes = await staticPrerender();

console.log(`\nPrerendered ${routes.length} route(s):`);
for (const { routeName } of routes) {
  console.log(`  ${routeName}`);
}

if (process.argv.includes("--preview")) {
  const routeMap = new Map<string, string>(
    routes.map(({ routeName, filePath }) => [routeName, filePath]),
  );
  const port = 3000;

  console.log(`\nPreview server: http://localhost:${port}`);

  Bun.serve({
    port,
    async fetch(request) {
      const url = new URL(request.url);
      const filePath = routeMap.get(url.pathname);

      if (filePath) {
        return new Response(Bun.file(filePath));
      }

      return new Response("Not Found", { status: 404 });
    },
  });
}
