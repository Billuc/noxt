import routeMap from "./.cache/routes.json";

const routes: Bun.Serve.Routes<any, any> = {};

for (let route in routeMap) {
  routes[route] = new Response(Bun.file(routeMap[route]!));
}

Bun.serve({
  port: 2101,
  routes,
});
