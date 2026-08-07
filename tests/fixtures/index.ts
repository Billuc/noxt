import routeMap from "./.cache/routes.json";
import { router } from "./.cache/api";

const routes: Bun.Serve.Routes<any, any> = {};

// Add API routes
Object.assign(routes, router.getRoutes());

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
