import {
  prerenderIslands,
  generateRouteMap,
  generateRouteUtils,
  generateStaticPages,
  discoverAPIs,
  generateAPIFile,
  discoverAssets,
  discoverPreactPages,
  discoverMarkdownPages,
  discoverIslands,
  prerenderPreactPages,
  prerenderMarkdownPages,
  BuildPipeline,
} from "noxt";
import { generateAssetUtils } from "../../src/assets";

process.env["NOXT_MODE"] = "dev";

const context = await BuildPipeline.newPipeline()
  .with(discoverAssets)
  .with(discoverPreactPages)
  .with(discoverMarkdownPages)
  .with((ctx) => ({ pageFiles: [...ctx.preactFiles, ...ctx.markdownFiles] }))
  .do(generateRouteUtils)
  .do(generateAssetUtils)
  .with(discoverAPIs)
  .do(generateAPIFile)
  .with(discoverIslands)
  .with(prerenderIslands)
  .with(prerenderPreactPages)
  .with(prerenderMarkdownPages)
  .with((ctx) => ({
    pages: [...ctx.preactPages, ...ctx.markdownPages],
  }))
  .with(generateRouteMap)
  .with(generateStaticPages)
  .build();

console.log(context.manifest);
