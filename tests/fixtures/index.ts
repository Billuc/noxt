import { prepareRoutes } from "noxt" with { type: "macro" };

// @ts-ignore
const routes = await import(prepareRoutes()).default;
console.log(routes);

Bun.serve({
  port: 2101,
  routes,
});
