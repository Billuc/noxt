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
  Path,
  writeFile,
} from "../core/fs";
import { generateSSRUtilsCode } from "./code_generation";
import { type SSRRouteEntry, SSRRoute } from "./types";
import { HTTP_METHODS } from "../core/types";
import path from "node:path";

export async function discoverSSRRoutes(): Promise<{
  ssrRouteEntries: SSRRouteEntry<any>[];
}> {
  let pageFiles: Path[];
  try {
    pageFiles = await getFilesMatchingGlob(
      "**/*.{ts,js}",
      path.resolve(SSR_DIR),
    );
  } catch {
    console.log("No api directory found !");
    return { ssrRouteEntries: [] };
  }

  const entries: SSRRouteEntry<any>[] = [];
  for (const file of pageFiles) {
    const exports = await import(file.absolute);
    const ssrRoute = getRouteName(file.relativeTo("src"));

    for (const method of HTTP_METHODS) {
      if (method in exports && exports[method] instanceof SSRRoute) {
        entries.push({
          method,
          route: ssrRoute,
          input: exports[method].input,
          file,
        });
      }
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
