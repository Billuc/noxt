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
import type { Path } from "../core/fs";
import { getRouteName } from "../core/rendering";
import { API_DIR, getFilesMatchingGlob } from "../shell/fs";
import {
  type HttpMethod,
  type SomeSchema,
  APIEndpoint,
  HTTP_METHODS,
} from "./types";
import path from "node:path";

export interface APIEndpointEntry<
  TInput extends SomeSchema,
  TOutput extends SomeSchema,
> {
  method: HttpMethod;
  route: string;
  input: TInput;
  output: TOutput;
  file: Path;
}

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

export async function generateAPIFile(entries: APIEndpointEntry<any, any>[]) {
  const importMap: Map<
    string,
    {
      prefix: string;
      methods: Set<HttpMethod>;
    }
  > = new Map();
  const apis: string[] = [];

  for (const entry of entries) {
    const importPrefix = entry.route.replaceAll(/\\\//, "_");

    importMap
      .getOrInsert(entry.file.relativeToCwd(), {
        prefix: importPrefix,
        methods: new Set<HttpMethod>(),
      })
      .methods.add(entry.method);

    apis.push(
      `"${entry.method} ${entry.route}": ${importPrefix}_${entry.method}`,
    );
  }

  const imports: string[] = [];
  for (const [fileToImport, importData] of importMap.entries()) {
    const importElements = importData.methods
      .values()
      .map((m) => `${m} as ${importData.prefix}_${m}`)
      .toArray();
    imports.push(
      `import { ${importElements.join(", ")} } from ${fileToImport};`,
    );
  }

  let code = `${imports.join("\n")}
  
  export default {
    ${apis.join(",\n\t")}
  };`;

  return code;
}
