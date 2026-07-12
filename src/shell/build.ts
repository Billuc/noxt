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
import { Path } from "../core/fs";
import * as esbuild from "esbuild";
import { isDev } from "./env";

export interface RouteData {
  routeName: string;
  filePath: Path;
}

export interface FileEntry {
  url: string;
  filePath: Path;
}

export type { IslandEntry } from "../core/registry";

export async function prerenderIslands(): Promise<IslandEntry[]> {
  let islandFiles: Path[];
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
      return [ie.files.file.absolute];
    }
    return [];
  });

  const result = await esbuild.build({
    entryPoints: entrypoints,
    outdir: path.resolve(ISLANDS_CACHE_DIR),
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
    absPaths: ["metafile"],
  });

  const entriesToKeep = islands.filter((ie) => ie.files.type === "bundle");
  const newEntriesMap: Record<string, IslandEntry> = {};

  islands.forEach((ie) => {
    if (ie.files.type !== "source") return;

    newEntriesMap[ie.files.file.relativeToCwd()] = {
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
      const entry = getIslandEntry(newEntriesMap, input);
      if (entry?.files.type === "bundle") {
        entry.files.files.push(Path.resolve(output));
      }
    }
  }

  return [...entriesToKeep, ...Object.values(newEntriesMap)];
}

function getIslandEntry(
  islandMap: Record<string, IslandEntry>,
  inputFile: string,
): IslandEntry | undefined {
  const sanitizedInput = inputFile.replaceAll("\\", "/");

  for (const key in islandMap) {
    const sanitizedKey = key.replaceAll("\\", "/");
    if (sanitizedInput === sanitizedKey) {
      return islandMap[key];
    }
  }

  return undefined;
}

export async function prerenderPages(
  pageFiles: FileEntry[],
  islands: IslandEntry[],
): Promise<RouteData[]> {
  setIslandMap(islands);
  const pages = await Promise.all(
    pageFiles.map(({ url, filePath }) => prerenderPage(url, filePath)),
  );
  return pages;
}

async function prerenderPage(
  routeName: string,
  pathFromPages: Path,
): Promise<RouteData> {
  const extension = path.extname(pathFromPages.absolute);
  console.log(`Prerendering page [${routeName}]`);

  let prerenderedFile: Path;
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
    await copyFile(route.filePath.absolute, outputPath);
    manifest[route.routeName] = outputPath;
  }

  for (const entry of islandEntries) {
    for (const file of getIslandFiles(entry)) {
      const islandRelPath = file.relativeTo(ISLANDS_CACHE_DIR);
      let outputPath = distPath("_islands", islandRelPath);
      await copyFile(file.absolute, outputPath);
      manifest[toPublicPath(outputPath)] = outputPath;
    }
  }

  for (const { filePath: assetPath } of assetFiles) {
    const assetRelPath = assetPath.relativeTo(ASSETS_DIR);
    let outputPath = distPath("assets", assetRelPath);
    await copyFile(assetPath.absolute, outputPath);
    manifest[toPublicPath(outputPath)] = outputPath;
  }

  return manifest;
}

export async function generateRouteMap(
  routes: RouteData[],
  islandEntries: IslandEntry[],
  assetFiles: FileEntry[],
): Promise<Path> {
  const manifest: Record<string, string> = {};

  for (const route of routes) {
    manifest[route.routeName] = route.filePath.relativeToCwd();
  }

  for (const { url, filePath: assetPath } of assetFiles) {
    manifest[url] = assetPath.relativeToCwd();
  }

  for (const entry of islandEntries) {
    for (const file of getIslandFiles(entry)) {
      manifest[toPublicPath(file.relativeTo(CACHE_DIR))] = file.relativeToCwd();
    }
  }

  const routesFile = path.resolve(ROUTES_CACHE_FILE);
  await writeFile(routesFile, JSON.stringify(manifest));
  console.log("Generated route map at .cache/routes.json");

  return Path.create(routesFile);
}

export async function collectAssets(): Promise<FileEntry[]> {
  let assetFiles: Path[];
  try {
    assetFiles = await getFilesMatchingGlob("**/*", path.resolve(ASSETS_DIR));
  } catch {
    console.log("No assets folder found");
    return [];
  }
  return assetFiles.map((file) => ({
    url: toPublicPath(file.relativeToCwd()),
    filePath: file,
  }));
}

export async function generateUtils(
  pageFiles: FileEntry[],
  assetFiles: FileEntry[],
): Promise<void> {
  const routeNames = pageFiles.map(({ url }) => url);
  const assetIds = assetFiles.map(({ url }) => url);
  const linkCode = generateLinkUtilsCode(routeNames);
  const assetCode = generateAssetUtilsCode(assetIds);
  const code = `${linkCode}\n${assetCode}`;
  const utilsFile = path.resolve(UTILS_CACHE_FILE);
  await writeFile(utilsFile, code);
  console.log("Generated utils at .cache/utils.ts");
}

export async function discoverRouteFiles(): Promise<FileEntry[]> {
  const pageFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js,md}",
    path.resolve(PAGES_DIR),
  );
  return pageFiles.map((file) => ({
    url: getRouteName(file.relativeTo(PAGES_DIR)),
    filePath: file,
  }));
}

export async function build(): Promise<{
  routes: RouteData[];
  islands: IslandEntry[];
  routeMap: Path;
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
