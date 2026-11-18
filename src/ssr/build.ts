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
import { getRouteName } from "../core/utils";
import {
  SSR_CACHE_FILE,
  SSR_DIR,
  getFilesMatchingGlob,
  writeFile,
} from "../core/fs";
import { importModule } from "../core/module";
import { generateSSRUtilsCode } from "./code_generation";
import { type SSRRouteEntry, SSRRoute } from "./types";
import { HTTP_METHODS } from "../core/types";
import path from "node:path";

export async function discoverSSRRoutes(): Promise<{
  ssrRouteEntries: SSRRouteEntry<any>[];
}> {
  const pageFiles = await getFilesMatchingGlob(
    "**/*.{ts,js}",
    path.resolve(SSR_DIR),
  );
  const entries: SSRRouteEntry<any>[] = [];
  for (const file of pageFiles) {
    const exports = await importModule(file.absolute, [...HTTP_METHODS]);
    if (!exports) continue;

    const ssrRoute = getRouteName(file.relativeTo("src"));

    for (const method of HTTP_METHODS) {
      if (!(method in exports)) continue;
      if (!(exports[method] instanceof SSRRoute)) {
        console.error(
          `SSR file "${file.absolute}" exports ${method}, but it is not a route. Export ${method} built with query() or mutation() from "noxt/ssr" to register it. Route skipped.`,
        );
        continue;
      }
      entries.push({
        method,
        route: ssrRoute,
        input: exports[method].input,
        file,
      });
    }
  }

  return { ssrRouteEntries: entries };
}

export async function generateSSRFile({
  ssrRouteEntries,
  base,
}: {
  ssrRouteEntries: SSRRouteEntry<any>[];
  base?: string;
}) {
  let code = generateSSRUtilsCode(ssrRouteEntries, base);

  const utilsFile = path.resolve(SSR_CACHE_FILE);
  await writeFile(utilsFile, code);
  console.log("Generated SSR utils at .cache/ssr.ts");
}
