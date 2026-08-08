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
  writeFile,
  ROUTES_CACHE_FILE,
  UTILS_CACHE_FILE,
} from "./fs";
import {
  generateAssetUtilsCode,
  generateLinkUtilsCode,
} from "./code_generation";
import { toPublicPath } from "./utils";
import { Path } from "./fs";
import type { IslandEntry } from "../islands";

interface RouteData {
  url: string;
  file: Path;
}

interface FileEntry {
  url: string;
  file: Path;
}

export async function generateRouteMap(
  routes: RouteData[],
  islandEntries: IslandEntry[],
  assetFiles: FileEntry[],
  base?: string,
): Promise<Path> {
  const manifest: Record<string, string> = {};

  for (const route of routes) {
    manifest[(base ?? "") + route.url] = route.file.relativeToCwd();
  }

  for (const { url, file: assetPath } of assetFiles) {
    manifest[url] = assetPath.relativeToCwd();
  }

  for (const entry of islandEntries) {
    for (const file of entry.files) {
      manifest[toPublicPath(file.relativeTo(CACHE_DIR), base ?? "")] =
        file.relativeToCwd();
    }
  }

  const routesFile = path.resolve(ROUTES_CACHE_FILE);
  await writeFile(routesFile, JSON.stringify(manifest));
  console.log("Generated route map at .cache/routes.json");

  return Path.create(routesFile);
}

export async function generateUtils(
  pageFiles: FileEntry[],
  assetFiles: FileEntry[],
  base?: string,
): Promise<void> {
  const routeNames = pageFiles.map(({ url }) => url);
  const assetIds = assetFiles.map(({ url }) => url);
  const linkCode = generateLinkUtilsCode(routeNames, base);
  const assetCode = generateAssetUtilsCode(assetIds);
  const code = `${linkCode}\n${assetCode}`;
  const utilsFile = path.resolve(UTILS_CACHE_FILE);
  await writeFile(utilsFile, code);
  console.log("Generated utils at .cache/utils.ts");
}
