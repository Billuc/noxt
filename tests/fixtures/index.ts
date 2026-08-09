import routeMap from "./.cache/routes.json";
import { handlers as apiHandlers } from "./.cache/api";

const routes: Bun.Serve.Routes<any, any> = {};

// Add API routes
Object.assign(routes, apiHandlers);

// Add static routes
for (let route in routeMap) {
  routes[route] = new Response(
    Bun.file(routeMap[route as keyof typeof routeMap]),
  );
}

const port = parseInt(process.env.PORT ?? "2101", 10);

Bun.serve({
  port,
  routes,
});
