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
import { copyFile, getFilesMatchingGlob, writeFile } from "./fs";
import { prepareIsland, prepareMarkdown, preparePreact } from "./prepare";
import { generateLinkUtilsCode } from "../core/code_generator";
import { getRouteName, toPublicPath } from "../core/rendering";
import {
  setIslandMap,
  getAssetRoutes,
  type IslandEntry,
  getIslandFiles,
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
  const entrypoints = islands.flatMap((ie) => {
    if (ie.files.type === "source") {
      return [ie.files.file.fromRoot];
    }
    return [];
  });

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

  const entriesToKeep = islands.filter(ie => ie.files.type === "bundle");
  const newEntriesMap: Record<string, IslandEntry> = {};

  islands.forEach(ie => {
    if (ie.files.type !== "source") return;

    newEntriesMap[ie.files.file.fromRoot] = {
      component: ie.component,
      hash: ie.hash,
      files: {
        type: "bundle",
        files: []
      }
    }
  });

  for (const output in result.metafile.outputs) {
    const inputs = result.metafile.outputs[output]?.inputs ?? {};
    for (const input in inputs) {
      if (input in newEntriesMap && newEntriesMap[input]?.files.type === "bundle") {
        newEntriesMap[input]!.files.files.push(RelativePath.fromRelative(output));
      }
    }
  }

  return [...entriesToKeep, ...Object.values(newEntriesMap)];
}

export async function prerenderPages(
  pageFiles: [string, RelativePath][],
  islands: IslandEntry[],
): Promise<RouteData[]> {
  setIslandMap(islands);
  const pages = await Promise.all(pageFiles.map(([routeName, file]) => prerenderPage(routeName, file)));
  return pages;
}

async function prerenderPage(routeName: string, pathFromPages: RelativePath): Promise<RouteData> {
  const extension = path.extname(pathFromPages.fromRoot);
  console.log(`Prerendering page [${routeName}]`);

  let prerenderedFile: RelativePath;
  if (extension === ".md") {
    prerenderedFile = await prepareMarkdown(pathFromPages.absolute);
  } else {
    prerenderedFile = await preparePreact(pathFromPages.absolute);
  }
  return { routeName, filePath: prerenderedFile };
}

export async function generateStaticPages(
  routes: RouteData[],
  islandEntries: IslandEntry[],
): Promise<Record<string, string>> {
  const manifest: Record<string, string> = {};

  for (const route of routes) {
    const routeName = route.routeName === "/" ? "" : route.routeName;
    let distPath = "dist" + routeName + "/index.html";
    distPath = distPath.replaceAll("/", path.sep);
    await copyFile(route.filePath.fromRoot, distPath);
    manifest[route.routeName] = distPath;
  }

  for (const [url, assetPath] of getAssetRoutes()) {
    const distUrl = url.replace("/.cache", "");
    const distAssetPath = assetPath.fromRoot.replace(".cache", "dist");
    await copyFile(assetPath.fromRoot, distAssetPath);
    manifest[distUrl] = distAssetPath;
  }

  for (const entry of islandEntries) {
    for (const file of getIslandFiles(entry)) {
      const distPath = file.fromRoot.replace("dist/", "");
      manifest[toPublicPath(distPath)] = "dist/" + distPath;
    }
  }

  return manifest;
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
    for (const file of getIslandFiles(entry)) {
      manifest[toPublicPath(file.fromRoot)] = file.fromRoot;
    }
  }

  const routesFile = path.resolve(".cache", "routes.json");
  await writeFile(routesFile, JSON.stringify(manifest));
  console.log("Generated route map at .cache/routes.json");

  return RelativePath.fromCwd(routesFile);
}

export async function generateLinkUtils(
  pageFiles: [string, RelativePath][],
): Promise<void> {
  const routeNames = pageFiles.map(([routeName]) => routeName);
  const code = generateLinkUtilsCode(routeNames);
  const utilsFile = path.resolve(".cache", "utils.ts");
  await writeFile(utilsFile, code);
  console.log("Generated link utils at .cache/utils.ts");
}

export async function discoverRouteFiles(): Promise<[string, RelativePath][]> {
  const pageFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js,md}",
    path.resolve("pages"),
  );
  return pageFiles.map(file => [getRouteName(file.fromRoot), file]);
}

export async function build(): Promise<{
  routes: RouteData[];
  islands: IslandEntry[];
  routeMap: RelativePath;
}> {
  let islands = await prerenderIslands();
  islands = await bundleIslands(islands);

  const pageFiles = await discoverRouteFiles();
  await generateLinkUtils(pageFiles);

  const routes = await prerenderPages(pageFiles, islands);
  const routeMap = await generateRouteMap(routes, islands);
  return { routes, islands, routeMap };
}
