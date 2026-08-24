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
import { createContext, type FunctionComponent } from "preact";
import type { IslandEntry } from "../islands";
import type { QueryParams } from "./types";

export interface PageContextInterface {
  base?: string;
  islands?: IslandEntry[];
  page?: <PageId extends string>(pageId: PageId, query: QueryParams) => string;
  asset?: <AssetId extends string>(assetId: AssetId) => string;
}

function defaultPageFunction(_pageId: string, _query: QueryParams): string {
  throw new Error(
    "No page function has been provided ! Did you run generatePageUtils before ?",
  );
}

function defaultAssetFunction(_assetId: string): string {
  throw new Error(
    "No asset function has been provided ! Did you run generateAssetUtils before ?",
  );
}

export class PageContextData {
  constructor(
    public base: string = "",
    public islandMap: Map<FunctionComponent<any>, IslandEntry> = new Map(),
    public page: <PageId extends string>(
      pageId: PageId,
      query: QueryParams,
    ) => string = defaultPageFunction,
    public asset: <AssetId extends string>(
      assetId: AssetId,
    ) => string = defaultAssetFunction,
  ) {}

  static from(data: PageContextInterface): PageContextData {
    const islandMap = new Map<FunctionComponent<any>, IslandEntry>();
    for (const island of data.islands ?? []) {
      islandMap.set(island.component, island);
    }

    return new PageContextData(data.base, islandMap, data.page, data.asset);
  }
}

export const PageContext = createContext<PageContextData>(
  new PageContextData(),
);
