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
import { getRouteName } from "../core/rendering";
import {
  API_CACHE_FILE,
  API_DIR,
  getFilesMatchingGlob,
  writeFile,
} from "../shell/fs";
import { generateApiUtilsCode } from "./code_generation";
import { type APIEndpointEntry, APIEndpoint, HTTP_METHODS } from "./types";
import path from "node:path";

export async function discoverAPIs(): Promise<APIEndpointEntry<any, any>[]> {
  const pageFiles = await getFilesMatchingGlob(
    "**/*.{ts,js}",
    path.resolve(API_DIR),
  );

  const entries: APIEndpointEntry<any, any>[] = [];
  for (const file of pageFiles) {
    const exports = await import(file.absolute);
    const apiRoute = getRouteName(file.relativeToCwd());

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

  return entries;
}

export async function generateAPIFile(
  entries: APIEndpointEntry<any, any>[],
  base?: string,
) {
  let code = generateApiUtilsCode(entries, base);

  const utilsFile = path.resolve(API_CACHE_FILE);
  await writeFile(utilsFile, code);
  console.log("Generated api utils at .cache/api.ts");
}
