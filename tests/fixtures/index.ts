import routes from "./routes.js";

Bun.serve({
  port: 2101,
  routes,
});
