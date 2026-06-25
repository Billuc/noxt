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
import type { FunctionComponent } from "preact";
import type { RelativePath } from "./fs";

export interface IslandEntry {
  component: FunctionComponent<any>;
  hash: string;
  files: RelativePath[];
}

const islandComponentMap = new Map<FunctionComponent<any>, IslandEntry>();

export function setIslandMap(entries: IslandEntry[]) {
  islandComponentMap.clear();
  for (const entry of entries) {
    islandComponentMap.set(entry.component, entry);
  }
}

export function getIslandEntry<T>(
  component: FunctionComponent<T>,
): IslandEntry | undefined {
  return islandComponentMap.get(component);
}

const assetRoutes = new Map<string, RelativePath>();

export function addAssetRoute(publicPath: string, path: RelativePath) {
  assetRoutes.set(publicPath, path);
}

export function getAssetRoutes(): ReadonlyMap<string, RelativePath> {
  return assetRoutes;
}
