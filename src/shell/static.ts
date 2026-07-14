import path from "node:path";
import { cp, mkdir } from "node:fs/promises";
import { build } from "./build";
import { getRouteName } from "../core/rendering";

export async function staticPrerender(): Promise<Record<string, string>> {
  console.log("Exporting static site...");

  const { routes } = await build();
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
    routeData[routeName] = dest;
  }

  console.log("Static export complete! Output in dist/");
  return routeData;
}
