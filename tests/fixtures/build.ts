import {
  build,
  prerenderIslands,
  prerenderPages,
  generateRouteMap,
  generateLinkUtils,
  discoverRouteFiles,
  bundleIslands,
  generateStaticPages,
} from "noxt";

process.env["NOXT_MODE"] = "dev";

let islands = await prerenderIslands();
islands = await bundleIslands(islands);

// Generate utils.ts before prerendering so pages can import link()
const pageFiles = await discoverRouteFiles();
await generateLinkUtils(pageFiles);

const routes = await prerenderPages(pageFiles, islands);
const routeMap = await generateRouteMap(routes, islands);
const staticManifest = await generateStaticPages(routes, islands);

console.log(staticManifest);
