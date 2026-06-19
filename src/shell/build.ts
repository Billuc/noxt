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
import type { FunctionComponent } from "preact";
import { html } from "htm/preact";
import * as devalue from "devalue";
import { getFilesMatchingGlob, writeFile, readFile, copyFile } from "./fs";
import { prepareMarkdown, preparePreact } from "./prepare";
import { getRouteName } from "../core/rendering";
import { generateRouteMapCode } from "../core/code_generator";
import {
  setIslandMap,
  getIslandEntry,
  addAssetRoute,
  getAssetRoutes,
  type IslandEntry,
} from "../core/registry";
import { generateScriptForIsland } from "../core/island";
import { RelativePath } from "../core/fs";

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
    const mod = await import(file.absolute);
    const component = mod.default as FunctionComponent<any>;
    if (!component) {
      console.warn(
        `Island file ${file.fromRoot} has no default export, skipping`,
      );
      continue;
    }

    const hash = new Bun.CryptoHasher("sha256")
      .update(file.absolute)
      .digest("base64url");
    const scriptContent = generateScriptForIsland(hash, file.absolute);
    const scriptPath = path.resolve(".cache", hash + ".js");
    await writeFile(scriptPath, scriptContent);

    entries.push({
      component,
      hash,
      path: RelativePath.fromCwd(scriptPath),
      publicPath: `/.cache/${hash}.js`,
    });

    console.log(
      `Prerendered island [${component.displayName ?? component.name}] -> ${hash}.js`,
    );
  }

  return entries;
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

  // TODO: manifest isn't correct

  const manifestFile = path.resolve(".cache", "manifest.json");
  await writeFile(manifestFile, JSON.stringify(pages, null, 2));

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
    const mod = await import(pathFromPages.absolute);
    const Page = mod.default as FunctionComponent<any> | undefined;
    if (!Page)
      throw new Error(`File ${pathFromPages.fromRoot} has no default export !`);
    const prerenderedFile = await preparePreact(Page);
    return { routeName, filePath: prerenderedFile };
  }
}

export function useIsland<T>(
  component: FunctionComponent<T>,
): FunctionComponent<T> {
  const entry = getIslandEntry(component);
  if (!entry) {
    throw new Error(
      `Component "${component.displayName ?? component.name}" has not been prerendered as an island. ` +
        "Make sure prerenderIslands() is called before prerenderPages().",
    );
  }

  return (props: T) => {
    return html`
      <div data-island=${entry.hash} data-props=${devalue.stringify(props)}>
        <${component} ...${props} />
      </div>
      <script src=${entry.publicPath}></script>
    `;
  };
}

export async function generateRouteMap(
  routes: RouteData[],
  islandEntries: IslandEntry[],
): Promise<void> {
  const manifest: Record<string, string> = {};

  for (const route of routes) {
    manifest[route.routeName] = route.filePath.fromRoot;
  }

  for (const [url, assetPath] of getAssetRoutes()) {
    manifest[url] = assetPath.fromRoot;
  }

  for (const entry of islandEntries) {
    manifest[entry.publicPath] = entry.path.fromRoot;
  }

  const code = generateRouteMapCode(manifest);
  const routesFile = path.resolve(".cache", "routes.js");
  await writeFile(routesFile, code);
  console.log("Generated route map at .cache/routes.js");
}

export async function generateRouteMapFromCache(): Promise<void> {
  const manifest: Record<string, string> = {};

  // TODO

  const code = generateRouteMapCode(manifest);
  const routesFile = path.resolve("routes.js");
  await writeFile(routesFile, code);
  console.log("Generated route map from cache at routes.js");
}

export async function importAsset(sourcePath: string): Promise<string> {
  const absPath = path.resolve(sourcePath);
  const filename = path.basename(absPath);
  const destPath = path.join(".cache", "assets", filename);
  const publicPath = `/.cache/assets/${filename}`;

  await copyFile(absPath, destPath);
  addAssetRoute(publicPath, RelativePath.fromCwd(destPath));
  console.log(`Copied asset ${sourcePath} -> .cache/assets/${filename}`);

  return publicPath;
}

export async function build(): Promise<{
  routes: RouteData[];
  islands: IslandEntry[];
}> {
  const islands = await prerenderIslands();
  const routes = await prerenderPages(islands);
  await generateRouteMap(routes, islands);
  return { routes, islands };
}
