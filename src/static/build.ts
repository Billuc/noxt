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
  ISLANDS_CACHE_DIR,
  ASSETS_DIR,
  DIST_DIR,
  distPath,
  copyFile,
  Path,
} from "../core/fs";
import { toPublicPath } from "../core/utils";
import type { IslandEntry } from "../islands";
import type { AssetEntry } from "../assets";

interface RouteData {
  url: string;
  file: Path;
}

export async function generateStaticPages(
  routes: RouteData[],
  islandEntries: IslandEntry[],
  assetFiles: AssetEntry[],
  base?: string,
): Promise<Record<string, string>> {
  console.log("Exporting static files...");
  const manifest: Record<string, string> = {};

  for (const route of routes) {
    const routeName = route.url === "/" ? "" : route.url;
    let outputPath = DIST_DIR + routeName + "/index.html";
    outputPath = outputPath.replaceAll("/", path.sep);
    await copyFile(route.file.absolute, outputPath);
    manifest[toPublicPath(route.url, base ?? "")] = outputPath;
  }

  for (const entry of islandEntries) {
    for (const file of entry.files) {
      const islandRelPath = file.relativeTo(ISLANDS_CACHE_DIR);
      let outputPath = distPath("_islands", islandRelPath);
      await copyFile(file.absolute, outputPath);
      manifest[toPublicPath(outputPath, base ?? "")] = outputPath;
    }
  }

  for (const asset of assetFiles) {
    const assetRelPath = asset.file.relativeTo(ASSETS_DIR);
    let outputPath = distPath("assets", assetRelPath);
    await copyFile(asset.file.absolute, outputPath);
    manifest[toPublicPath(asset.url, base ?? "")] = outputPath;
  }

  return manifest;
}
