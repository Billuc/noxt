/**
 * Copyright 2026 Luc BILLAUD
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 **/
import path from "node:path";
import { getFilesMatchingGlob, writeFile, type RelativePath } from "./fs";
import { prepareMarkdown, preparePreact } from "./prepare";
import { getRouteName } from "../core/rendering";
import { generateRouteMapCode } from "../core/code_generator";

interface RouteData {
  routeName: string;
  filePath: string;
}

/** Discovers all pages, prerenders them, and generates a route manifest file. */
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
