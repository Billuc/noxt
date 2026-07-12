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
import {
  CACHE_DIR,
  ISLANDS_CACHE_DIR,
  ISLANDS_DIR,
  ASSETS_DIR,
  PAGES_DIR,
  DIST_DIR,
  distPath,
  copyFile,
  getFilesMatchingGlob,
  writeFile,
  ROUTES_CACHE_FILE,
  UTILS_CACHE_FILE,
} from "./fs";
import { prepareIsland, prepareMarkdown, preparePreact } from "./prepare";
import {
  generateAssetUtilsCode,
  generateLinkUtilsCode,
} from "../core/code_generator";
import { getRouteName, toPublicPath } from "../core/rendering";
import {
  setIslandMap,
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

export interface FileEntry {
  url: string;
  filePath: RelativePath;
}

export type { IslandEntry } from "../core/registry";

export async function prerenderIslands(): Promise<IslandEntry[]> {
  let islandFiles: RelativePath[];
  try {
    islandFiles = await getFilesMatchingGlob(
      "*.{tsx,ts,jsx,js}",
      path.resolve(ISLANDS_DIR),
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
    outdir: ISLANDS_CACHE_DIR,
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

  const entriesToKeep = islands.filter((ie) => ie.files.type === "bundle");
  const newEntriesMap: Record<string, IslandEntry> = {};

  islands.forEach((ie) => {
    if (ie.files.type !== "source") return;

    newEntriesMap[ie.files.file.fromRoot] = {
      component: ie.component,
      hash: ie.hash,
      files: {
        type: "bundle",
        files: [],
      },
    };
  });

  for (const output in result.metafile.outputs) {
    const inputs = result.metafile.outputs[output]?.inputs ?? {};
    for (const input in inputs) {
      const entry = getMapFileInput(newEntriesMap, input);
      if (entry?.files.type === "bundle") {
        entry.files.files.push(RelativePath.fromRelative(output));
      }
    }
  }

  return [...entriesToKeep, ...Object.values(newEntriesMap)];
}

function getMapFileInput<T>(
  map: Record<string, T>,
  inputFile: string,
): T | undefined {
  const sanitizedInput = inputFile.replaceAll("\\", "/");

  for (const key in map) {
    const sanitizedKey = key.replaceAll("\\", "/");
    if (sanitizedInput === sanitizedKey) {
      return map[key];
    }
  }

  return undefined;
}

export async function prerenderPages(
  pageFiles: [string, RelativePath][],
  islands: IslandEntry[],
): Promise<RouteData[]> {
  setIslandMap(islands);
  const pages = await Promise.all(
    pageFiles.map(([routeName, file]) => prerenderPage(routeName, file)),
  );
  return pages;
}

async function prerenderPage(
  routeName: string,
  pathFromPages: RelativePath,
): Promise<RouteData> {
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
  assetFiles: FileEntry[],
): Promise<Record<string, string>> {
  const manifest: Record<string, string> = {};

  for (const route of routes) {
    const routeName = route.routeName === "/" ? "" : route.routeName;
    let outputPath = DIST_DIR + routeName + "/index.html";
    outputPath = outputPath.replaceAll("/", path.sep);
    await copyFile(route.filePath.fromRoot, outputPath);
    manifest[route.routeName] = outputPath;
  }

  for (const entry of islandEntries) {
    for (const file of getIslandFiles(entry)) {
      const islandRelPath = path.relative(ISLANDS_CACHE_DIR, file.fromRoot);
      let outputPath = distPath("_islands", islandRelPath);
      await copyFile(file.fromRoot, outputPath);
      manifest[toPublicPath(outputPath)] = outputPath;
    }
  }

  for (const { filePath: assetPath } of assetFiles) {
    const assetRelPath = path.relative(ASSETS_DIR, assetPath.fromRoot);
    let outputPath = distPath("assets", assetRelPath);
    await copyFile(assetPath.fromRoot, outputPath);
    manifest[toPublicPath(outputPath)] = outputPath;
  }

  return manifest;
}

export async function generateRouteMap(
  routes: RouteData[],
  islandEntries: IslandEntry[],
  assetFiles: FileEntry[],
): Promise<RelativePath> {
  const manifest: Record<string, string> = {};

  for (const route of routes) {
    manifest[route.routeName] = route.filePath.fromRoot;
  }

  for (const { url, filePath: assetPath } of assetFiles) {
    manifest[url] = assetPath.fromRoot;
  }

  for (const entry of islandEntries) {
    for (const file of getIslandFiles(entry)) {
      manifest[toPublicPath(file.fromRoot)] = file.fromRoot;
    }
  }

  const routesFile = path.resolve(ROUTES_CACHE_FILE);
  await writeFile(routesFile, JSON.stringify(manifest));
  console.log("Generated route map at .cache/routes.json");

  return RelativePath.fromCwd(routesFile);
}

export async function collectAssets(): Promise<FileEntry[]> {
  let assetFiles: RelativePath[];
  try {
    assetFiles = await getFilesMatchingGlob("**/*", path.resolve(ASSETS_DIR));
  } catch {
    console.log("No assets folder found");
    return [];
  }
  return assetFiles.map((file) => ({
    url: "/assets" + toPublicPath(file.fromRoot),
    filePath: RelativePath.fromCwd(file.absolute),
  }));
}

export async function generateUtils(
  pageFiles: [string, RelativePath][],
  assetFiles: FileEntry[],
): Promise<void> {
  const routeNames = pageFiles.map(([routeName]) => routeName);
  const assetIds = assetFiles.map(({ url }) => url);
  const linkCode = generateLinkUtilsCode(routeNames);
  const assetCode = generateAssetUtilsCode(assetIds);
  const code = `${linkCode}\n${assetCode}`;
  const utilsFile = path.resolve(UTILS_CACHE_FILE);
  await writeFile(utilsFile, code);
  console.log("Generated utils at .cache/utils.ts");
}

export async function discoverRouteFiles(): Promise<[string, RelativePath][]> {
  const pageFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js,md}",
    path.resolve(PAGES_DIR),
  );
  return pageFiles.map((file) => [getRouteName(file.fromRoot), file]);
}

export async function build(): Promise<{
  routes: RouteData[];
  islands: IslandEntry[];
  routeMap: RelativePath;
}> {
  let islands = await prerenderIslands();
  islands = await bundleIslands(islands);

  let assetFiles = await collectAssets();

  const pageFiles = await discoverRouteFiles();
  await generateUtils(pageFiles, assetFiles);

  const routes = await prerenderPages(pageFiles, islands);
  const routeMap = await generateRouteMap(routes, islands, assetFiles);
  return { routes, islands, routeMap };
}
