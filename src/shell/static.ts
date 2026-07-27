import path from "node:path";
import { cp, mkdir } from "node:fs/promises";
import {
  build,
  collectAssets,
  generateStaticPages,
} from "./build";
import { getRouteName } from "../core/rendering";
import { generateServiceWorker } from "./pwa";

export async function staticPrerender(base: string = ""): Promise<Record<string, string>> {
  console.log("Exporting static site...");

  const { routes, islands } = await build(base);
  const outdir = path.resolve("dist");
  await mkdir(outdir, { recursive: true });

  const routeData: Record<string, string> = {};
  for (const route of routes) {
    const source = route.filePath.absolute;
    if (!source.endsWith(".html")) continue;
    const pathFromDist = path.relative(outdir, source);
    const dest = path.join(outdir, pathFromDist);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(source, dest);
    const routeName = pathFromDist.endsWith(".html")
      ? getRouteName(pathFromDist)
      : "/" + pathFromDist;
    routeData[base + routeName] = dest;
  }

  const assetFiles = await collectAssets();
  const manifest = await generateStaticPages(routes, islands, assetFiles, base);
  await generateServiceWorker(manifest);

  console.log("Static export complete! Output in dist/");
  return routeData;
}
