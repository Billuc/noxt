import path from "node:path";
import { getFilesMatchingGlob, writeFile, type RelativePath } from "./fs";
import { prepareMarkdown, preparePreact } from "./prepare";
import { getRouteName } from "../core/rendering";
import { generateRouteMapCode } from "../core/code_generator";

export interface RouteData {
  routeName: string;
  filePath: string;
}

export async function prepareRoutes(): Promise<string> {
  const pagesFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js,md}",
    path.resolve("pages"),
  );
  const pages = await Promise.all(pagesFiles.map(prerenderPage));

  const manifest: Record<string, string> = {};
  for (const routeData of pages) {
    manifest[routeData.routeName] = routeData.filePath;
  }

  const routesMapCode = generateRouteMapCode(manifest);
  const routeMapFile = path.resolve(".cache", "routes.js");
  await writeFile(routeMapFile, routesMapCode);

  const manifestFile = path.resolve(".cache", "manifest.json");
  await writeFile(manifestFile, JSON.stringify(pages, null, 2));

  return routeMapFile;
}

async function prerenderPage(pathFromPages: RelativePath): Promise<RouteData> {
  const extension = path.extname(pathFromPages.fromRoot);
  const routeName = getRouteName(pathFromPages.fromRoot);
  console.log(`Prerendering page [${routeName}]`);

  if (extension === ".md") {
    const prerenderedFile = await prepareMarkdown(pathFromPages.absolute);
    return { routeName, filePath: prerenderedFile };
  } else {
    const Page = (await import(pathFromPages.absolute)).default;
    if (!Page)
      throw new Error(`File ${pathFromPages.fromRoot} has no default export !`);
    const prerenderedFile = await preparePreact(Page);
    return { routeName, filePath: prerenderedFile };
  }
}
