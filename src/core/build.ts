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
  PAGES_DIR,
} from "./fs";
import { generateLinkUtilsCode } from "./code_generation";
import { getRouteName, toPublicPath } from "./utils";
import { buildUrlWithQuery } from "./url";
import { Path } from "./fs";
import type { IslandEntry } from "../islands";
import type { PageFunction, QueryParams, RouteData } from "./types";
import type { AssetEntry } from "../assets";

export async function generateRouteMap({
  pages,
  islands,
  assets,
  base,
}: {
  pages?: RouteData[];
  islands?: IslandEntry[];
  assets?: AssetEntry[];
  base?: string;
}): Promise<{ routeMapFile: Path }> {
  const manifest: Record<string, string> = {};

  for (const route of pages ?? []) {
    manifest[toPublicPath(route.url, base ?? "")] = route.file.relativeToCwd();
  }

  for (const asset of assets ?? []) {
    manifest[toPublicPath(asset.url, base ?? "")] = asset.file.relativeToCwd();
  }

  for (const island of islands ?? []) {
    for (const file of island.files) {
      manifest[toPublicPath(file.relativeTo(CACHE_DIR), base ?? "")] =
        file.relativeToCwd();
    }
  }

  const routesFile = path.resolve(ROUTES_CACHE_FILE);
  await writeFile(routesFile, JSON.stringify(manifest));
  console.log("Generated route map at .cache/routes.json");

  const routeMapFile = Path.create(routesFile);
  return { routeMapFile };
}

export async function generateRouteUtils({
  pageFiles,
  base,
}: {
  pageFiles: Path[];
  base?: string;
}): Promise<{ page: PageFunction }> {
  const routeNames = pageFiles.map((file) =>
    getRouteName(file.relativeTo(PAGES_DIR)),
  );
  const linkCode = generateLinkUtilsCode(routeNames);

  const utilsFile = path.resolve(UTILS_CACHE_FILE);
  await writeFile(utilsFile, linkCode);
  console.log("Generated utils at .cache/utils.ts");

  const page = preparePageFunction(routeNames, base);
  return { page };
}

function preparePageFunction(pageNames: string[], base?: string): PageFunction {
  function page<PageId extends string>(
    pageId: PageId,
    query?: QueryParams,
  ): string {
    if (!pageNames.includes(pageId)) {
      throw new Error(`Unknown page with URL '${pageId}'`);
    }

    return buildUrlWithQuery(base + pageId, query);
  }

  return page;
}
