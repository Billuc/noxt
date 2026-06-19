//@ts-ignore: This file will be created by the build step
import routes from "./.cache/routes.js";

Bun.serve({
  port: 2101,
  routes,
});
