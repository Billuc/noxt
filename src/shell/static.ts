import path from "node:path";
import { build, type RouteData } from "./build";
import { getRouteName } from "../core/rendering";

export async function staticPrerender(): Promise<Record<string, string>> {
  console.log("Exporting static site...");

  const { routes } = await build();
  const entrypoints = routes
    .map((r) => r.filePath.absolute)
    .filter((path) => path.endsWith(".html"));
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

    const routeData: Record<string, string> = {};
    for (const output of result.outputs) {
      const pathFromDist = path.relative(path.resolve("dist"), output.path);
      const routeName = pathFromDist.endsWith(".html")
        ? getRouteName(pathFromDist)
        : "/" + pathFromDist;
      routeData[routeName] = output.path;
    }

    return routeData;
  } catch {
    return {};
  }
}
