/**
 * Noxt demo hub — build step.
 *
 * Run from this directory (`examples/demo`):
 *   bun run build.ts                       # production prerender to .cache/ + dist/
 *   NOXT_MODE=dev bun run build.ts         # dev islands (sourcemaps, no minify)
 *   NOXT_BASE=/demo bun run build.ts       # base-path prefixing
 *
 * Then serve with `bun run serve.ts`.
 */
import {
  BuildPipeline,
  discoverAPIs,
  generateAPIFile,
  discoverAssets,
  generateAssetUtils,
  discoverIslands,
  prerenderIslands,
  discoverMarkdownPages,
  prerenderMarkdownPages,
  discoverPreactPages,
  prerenderPreactPages,
  generateRouteMap,
  generateRouteUtils,
  generateServiceWorker,
  generateStaticPages,
} from "noxt";

const base = Bun.env.NOXT_BASE ?? "";

// Islands first: pages embed them via <Island>, so they must be prerendered first.
const context = await BuildPipeline.newPipeline()
  .with(() => ({ base }))
  .with(discoverIslands)
  .with(prerenderIslands)
  .with(discoverAssets)
  .with(generateAssetUtils)
  .with(discoverPreactPages)
  .with(discoverMarkdownPages)
  .with(({ preactFiles, markdownFiles }) => ({
    pageFiles: [...preactFiles, ...markdownFiles],
  }))
  .with(generateRouteUtils)
  .with(prerenderPreactPages)
  .with(prerenderMarkdownPages)
  .with(discoverAPIs)
  .do(generateAPIFile)
  .with(({ preactPages, markdownPages }) => ({
    pages: [...preactPages, ...markdownPages],
  }))
  .with(generateStaticPages)
  .do(generateServiceWorker)
  .with(generateRouteMap)
  .build();

console.log(
  `Prerendered ${context.preactPages.length} preact pages, ` +
    `${context.markdownPages.length} markdown pages, ` +
    `${context.islands.length} islands, ` +
    `${context.assets.length} assets, ` +
    `${context.endpointEntries.length} API endpoints.`,
);
