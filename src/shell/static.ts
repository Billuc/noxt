import path from "node:path";
import { mkdir } from "node:fs/promises";
import { removeFolder, copyFile } from "./fs";
import { prepareRoutes, type RouteData } from "./routes";
import { getRouteName, routeToHtmlPath } from "../core/rendering";

export async function staticPrerender(): Promise<RouteData[]> {
  console.log("Exporting static site...");

  await prepareRoutes();
  const manifestPath = path.join(".cache", "manifest.json");
  const manifest: RouteData[] = await Bun.file(manifestPath).json();

  if (manifest.length === 0) {
    console.log("No pages to export.");
    return [];
  }

  const stagingDir = path.resolve(".export");
  await removeFolder(stagingDir);
  await mkdir(stagingDir, { recursive: true });

  const entrypoints: string[] = [];
  for (const { routeName, filePath: sourcePath } of manifest) {
    const htmlPath = routeToHtmlPath(routeName);
    const stagingPath = path.resolve(stagingDir, htmlPath);
    await copyFile(sourcePath, stagingPath);
    entrypoints.push(stagingPath);

    console.log(`  Staged [${routeName}]`);
  }

  console.log("Building with Bun...");

  let buildSuccess = false;
  try {
    const result = await Bun.build({
      entrypoints,
      outdir: path.resolve("dist"),
      minify: true,
    });

    if (!result.success) {
      console.error("Build failed:", result.logs);
      throw new Error("Static export build failed");
    }

    console.log("Static export complete! Output in dist/");

    const routeData = [];
    for (const output of result.outputs) {
      const pathFromDist = path.relative(path.resolve("dist"), output.path);
      const routeName = pathFromDist.endsWith(".html")
        ? getRouteName(pathFromDist)
        : "/" + pathFromDist;
      routeData.push({ routeName, filePath: output.path });
    }

    return routeData;
  } catch {
    return [];
  } finally {
    await removeFolder(stagingDir);
  }
}
