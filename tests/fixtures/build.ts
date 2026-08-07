import {
  prerenderIslands,
  prerenderPages,
  generateRouteMap,
  generateUtils,
  discoverRouteFiles,
  collectAssets,
  bundleIslands,
  generateStaticPages,
  discoverAPIs,
  generateAPIFile,
} from "noxt";

process.env["NOXT_MODE"] = "dev";

// Discover and generate API
const apiEntries = await discoverAPIs();
await generateAPIFile(apiEntries);

// Generate utils.ts before prerendering so pages can import link() and asset()
const assetFiles = await collectAssets();
const pageFiles = await discoverRouteFiles();
await generateUtils(pageFiles, assetFiles);

let islands = await prerenderIslands();
islands = await bundleIslands(islands);

const routes = await prerenderPages(pageFiles, islands);
const routeMap = await generateRouteMap(routes, islands, assetFiles);
const staticManifest = await generateStaticPages(routes, islands, assetFiles);

console.log(staticManifest);
