import {
  prerenderIslands,
  generateRouteMap,
  generateUtils,
  generateStaticPages,
  discoverAPIs,
  generateAPIFile,
  discoverAssets,
  discoverPreactPages,
  discoverMarkdownPages,
  discoverIslands,
  prerenderPreactPages,
  prerenderMarkdownPages,
} from "noxt";

process.env["NOXT_MODE"] = "dev";

// Generate utils.ts before prerendering so pages can import link() and asset()
const assetFiles = await discoverAssets();
const preactPages = await discoverPreactPages();
const markdownPages = await discoverMarkdownPages();
const allPages = [...preactPages, ...markdownPages];
await generateUtils(allPages, assetFiles);

// Discover and generate API
const apiEntries = await discoverAPIs();
await generateAPIFile(apiEntries);

let islandFiles = await discoverIslands();
const islands = await prerenderIslands(islandFiles);

const preactRoutes = await prerenderPreactPages(preactPages, "", islands);
const markdownRoutes = await prerenderMarkdownPages(markdownPages, "", islands);
const allRoutes = [...preactRoutes, ...markdownRoutes];
const routeMap = await generateRouteMap(allRoutes, islands, assetFiles);
const staticManifest = await generateStaticPages(
  allRoutes,
  islands,
  assetFiles,
);

console.log(staticManifest);
