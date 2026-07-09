import {
  prerenderIslands,
  prerenderPages,
  generateRouteMap,
  generateUtils,
  discoverRouteFiles,
  discoverAssets,
  copyAssets,
  bundleIslands,
  generateStaticPages,
} from "noxt";

process.env["NOXT_MODE"] = "dev";

let islands = await prerenderIslands();
islands = await bundleIslands(islands);

// Generate utils.ts before prerendering so pages can import link() and asset()
const pageFiles = await discoverRouteFiles();
const assetFiles = await discoverAssets();
await generateUtils(pageFiles, assetFiles);
await copyAssets(assetFiles);

const routes = await prerenderPages(pageFiles, islands);
const routeMap = await generateRouteMap(routes, islands, assetFiles);
const staticManifest = await generateStaticPages(routes, islands);

console.log(staticManifest);
