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
import * as path from "node:path";
import { getFilesMatchingGlob, writeFile } from "./fs";
import { prepareIsland, prepareMarkdown, preparePreact } from "./prepare";
import { getRouteName, toPublicPath } from "../core/rendering";
import {
  setIslandMap,
  getAssetRoutes,
  type IslandEntry,
} from "../core/registry";
import { RelativePath } from "../core/fs";
import * as esbuild from "esbuild";
import { isDev } from "./env";

export interface RouteData {
  routeName: string;
  filePath: RelativePath;
}

export type { IslandEntry } from "../core/registry";

export async function prerenderIslands(): Promise<IslandEntry[]> {
  let islandFiles: RelativePath[];
  try {
    islandFiles = await getFilesMatchingGlob(
      "*.{tsx,ts,jsx,js}",
      path.resolve("islands"),
    );
  } catch {
    console.log("No islands directory found, skipping island prerendering");
    return [];
  }

  const entries: IslandEntry[] = [];

  if (islandFiles.length === 0) {
    console.log("No islands found, skipping island prerendering");
    return entries;
  }

  for (const file of islandFiles) {
    const entry = await prepareIsland(file.absolute);

    if (entry === null) continue;

    entries.push(entry);
    console.log(
      `Prerendered island [${entry.component.displayName ?? entry.component.name}]`,
    );
  }

  return entries;
}

export async function bundleIslands(
  islands: IslandEntry[],
): Promise<IslandEntry[]> {
  const devMode = isDev();
  const entrypoints = islands.flatMap((ie) => ie.files.map((f) => f.fromRoot));

  const result = await esbuild.build({
    entryPoints: entrypoints,
    outdir: "dist",
    minify: !devMode,
    sourcemap: devMode,
    splitting: !devMode,
    jsxImportSource: "preact",
    jsx: "automatic",
    jsxDev: devMode,
    jsxFactory: "h",
    bundle: true,
    format: "esm",
    logLevel: "info",
    metafile: true,
  });

  for (const output in result.metafile.outputs) {
    console.log(output);
    const inputs = result.metafile.outputs[output]?.inputs ?? {};
    for (const input in inputs) {
      console.log(" <- " + input);
    }
  }

  return [];
}

export async function prerenderPages(
  islands: IslandEntry[],
): Promise<RouteData[]> {
  setIslandMap(islands);

  const pageFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js,md}",
    path.resolve("pages"),
  );

  const pages = await Promise.all(pageFiles.map(prerenderPage));
  return pages;
}

async function prerenderPage(pathFromPages: RelativePath): Promise<RouteData> {
  const extension = path.extname(pathFromPages.fromRoot);
  const routeName = getRouteName(pathFromPages.fromRoot);
  console.log(`Prerendering page [${routeName}]`);

  if (extension === ".md") {
    const prerenderedFile = await prepareMarkdown(pathFromPages.absolute);
    return { routeName, filePath: prerenderedFile };
  } else {
    const prerenderedFile = await preparePreact(pathFromPages.absolute);
    return { routeName, filePath: prerenderedFile };
  }
}

export async function generateRouteMap(
  routes: RouteData[],
  islandEntries: IslandEntry[],
): Promise<RelativePath> {
  const manifest: Record<string, string> = {};

  for (const route of routes) {
    manifest[route.routeName] = route.filePath.fromRoot;
  }

  for (const [url, assetPath] of getAssetRoutes()) {
    manifest[url] = assetPath.fromRoot;
  }

  for (const entry of islandEntries) {
    for (const file of entry.files) {
      manifest[toPublicPath(file.fromRoot)] = file.fromRoot;
    }
  }

  const routesFile = path.resolve(".cache", "routes.json");
  await writeFile(routesFile, JSON.stringify(manifest));
  console.log("Generated route map at .cache/routes.json");

  return RelativePath.fromCwd(routesFile);
}

export async function build(): Promise<{
  routes: RouteData[];
  islands: IslandEntry[];
  routeMap: RelativePath;
}> {
  const islands = await prerenderIslands();
  const routes = await prerenderPages(islands);
  const routeMap = await generateRouteMap(routes, islands);
  return { routes, islands, routeMap };
}
