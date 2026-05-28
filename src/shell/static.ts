import path from "node:path";
import { mkdir } from "node:fs/promises";
import { removeFolder, copyFile } from "./fs";
import { prepareRoutes, type RouteData } from "./routes";
import { routeToHtmlPath } from "../core/rendering";

export async function staticPrerender(): Promise<void> {
  console.log("Exporting static site...");

  await prepareRoutes();
  const manifestPath = path.join(".cache", "manifest.json");
  const manifest: RouteData[] = await Bun.file(manifestPath).json();

  if (manifest.length === 0) {
    console.log("No pages to export.");
    return;
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

    buildSuccess = true;
  } finally {
    await removeFolder(stagingDir);
  }

  if (buildSuccess) {
    console.log("Static export complete! Output in dist/");
  }
}
