import {
  prerenderIslands,
  prerenderPages,
  generateRouteMap,
  generateUtils,
  discoverRouteFiles,
  collectAssets,
  bundleIslands,
  generateStaticPages,
} from "noxt";

process.env["NOXT_MODE"] = "dev";

let islands = await prerenderIslands();
islands = await bundleIslands(islands);

// Generate utils.ts before prerendering so pages can import link() and asset()
const assetFiles = await collectAssets();
const pageFiles = await discoverRouteFiles();
await generateUtils(pageFiles, assetFiles);

const routes = await prerenderPages(pageFiles, islands);
const routeMap = await generateRouteMap(routes, islands, assetFiles);
const staticManifest = await generateStaticPages(routes, islands, assetFiles);

console.log(staticManifest);
