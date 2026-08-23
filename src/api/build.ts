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
  API_CACHE_FILE,
  API_DIR,
  getFilesMatchingGlob,
  Path,
  writeFile,
} from "../core/fs";
import { generateApiUtilsCode } from "./code_generation";
import { type APIEndpointEntry, APIEndpoint, HTTP_METHODS } from "./types";
import path from "node:path";

export async function discoverAPIs(): Promise<{
  endpointEntries: APIEndpointEntry<any, any>[];
}> {
  let pageFiles: Path[];
  try {
    pageFiles = await getFilesMatchingGlob(
      "**/*.{ts,js}",
      path.resolve(API_DIR),
    );
  } catch {
    console.log("No api directory found !");
    return { endpointEntries: [] };
  }

  const entries: APIEndpointEntry<any, any>[] = [];
  for (const file of pageFiles) {
    const exports = await import(file.absolute);
    const apiRoute = getRouteName(file.relativeTo("src"));

    for (const method of HTTP_METHODS) {
      if (method in exports && exports[method] instanceof APIEndpoint) {
        entries.push({
          method,
          route: apiRoute,
          input: exports[method].input,
          output: exports[method].output,
          file,
        });
      }
    }
  }

  return { endpointEntries: entries };
}

export async function generateAPIFile({
  endpointEntries,
  base,
}: {
  endpointEntries: APIEndpointEntry<any, any>[];
  base?: string;
}) {
  let code = generateApiUtilsCode(endpointEntries, base);

  const utilsFile = path.resolve(API_CACHE_FILE);
  await writeFile(utilsFile, code);
  console.log("Generated api utils at .cache/api.ts");
}
