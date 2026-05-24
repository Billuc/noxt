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

const IMPORT_PATH = Symbol("Island import path");

export type IslandComponent<T> = FunctionComponent<T> & {
  [IMPORT_PATH]: string;
};

export function defineIsland<T>(
  component: FunctionComponent<T>,
  importPath: string,
): IslandComponent<T> {
  let islandComponent: IslandComponent<T> = component as IslandComponent<T>;
  islandComponent[IMPORT_PATH] = importPath;
  return islandComponent;
}

export function getImportPath<T>(component: IslandComponent<T>): string {
  return component[IMPORT_PATH];
}

export function getHash<T>(component: IslandComponent<T>): string {
  return new Bun.CryptoHasher("sha256")
    .update(component[IMPORT_PATH])
    .digest("base64url");
}

export function generateScriptForIsland<T>(island: IslandComponent<T>): string {
  const renderScriptPath = path.join(__dirname, "..", "runtime", "render.ts");

  return `
    import { renderComponent } from ${JSON.stringify(renderScriptPath)};
    import Island from ${JSON.stringify(getImportPath(island))};
    renderComponent(Island, ${JSON.stringify(getHash(island))}); 
  `;
}
