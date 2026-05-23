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
import path from "path";
import type { NoxtConfig } from "../core/config";
import { copyAssets } from "../shell/assets";
import { prepareIslands, type IslandData } from "./island";
import { pagesDir } from "../core/paths";
import { getFilesMatchingGlob } from "./fs";

async function prerenderAll(
  config: NoxtConfig,
  islandsData: Record<string, IslandData>,
): Promise<{ routeName: string; prerenderPath: string }[]> {
  const pagesFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js,md}",
    pagesDir(config),
  );

  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "prerender-worker.ts"));
    worker.postMessage({ type: "config", data: config });
    worker.postMessage({ type: "islands", data: islandsData });
    worker.postMessage({ type: "prerender", data: pagesFiles });

    worker.addEventListener("message", (msg) => {
      resolve(msg.data);
    });

    worker.postMessage({ type: "start" });
  });
}

/**
 * Prepares the manifest by prerendering all pages and copying assets.
 *
 * This function:
 * - Copies assets from assetsDir to cache/assetsDir
 * - Prepares all island components for client-side hydration
 * - Scans the pages directory for page components and markdown files
 * - Prerenders each page to HTML with island placeholders
 * - Returns a mapping of routes to their HTML file paths
 *
 * @param config - Noxt configuration object
 * @returns Promise resolving to a record mapping route names to their prerendered HTML file paths
 *
 * @example
 * ```ts
 * import { prepareManifest, buildConfig } from "noxt";
 *
 * const config = buildConfig({});
 * const manifest = await prepareManifest(config);
 * // manifest = { "/": ".cache/pages/index.html", "/about": ".cache/pages/about.html", ... }
 * ```
 */
export async function prepareManifest(
  config: NoxtConfig,
): Promise<Record<string, string>> {
  await copyAssets(config);
  const islandsData = await prepareIslands(config);

  const manifest: Record<string, string> = {};
  const entries = await prerenderAll(config, islandsData);

  for (const entry of entries) {
    manifest[entry.routeName] = entry.prerenderPath;
  }

  return manifest;
}
