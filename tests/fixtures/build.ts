import {
  build,
  prerenderIslands,
  prerenderPages,
  generateRouteMap,
  bundleIslands,
} from "noxt";

process.env["NOXT_MODE"] = "dev";

const islands = await prerenderIslands();
await bundleIslands(islands);
const routes = await prerenderPages(islands);
const routeMap = await generateRouteMap(routes, islands);
