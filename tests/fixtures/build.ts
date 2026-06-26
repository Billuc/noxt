import {
  build,
  prerenderIslands,
  prerenderPages,
  generateRouteMap,
  bundleIslands,
  generateStaticPages,
} from "noxt";

process.env["NOXT_MODE"] = "dev";

let islands = await prerenderIslands();
islands = await bundleIslands(islands);
const routes = await prerenderPages(islands);
const routeMap = await generateRouteMap(routes, islands);
const staticManifest = await generateStaticPages(routes, islands);

console.log(staticManifest);
