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
import { createContext, h, type ComponentChild, type FunctionComponent } from "preact";
import type { IslandEntry } from "../islands";
import type { PageFunction, QueryParams } from "./types";
import type { AssetFunction } from "../assets/types";

/**
 * Build-time data used to prerender islands: the base URL and the
 * island registry. Not needed by hydrated island components.
 */
export interface PageContextInterface {
  base?: string;
  islands?: IslandEntry[];
}

/** Utility functions exposed to pages and islands. */
export interface UtilsContextInterface {
  page?: PageFunction;
  asset?: AssetFunction;
}

export interface FullPageContext extends PageContextInterface, UtilsContextInterface {}

function defaultPageFunction(_pageId: string, _query?: QueryParams): string {
  throw new Error(
    "No page function has been provided ! Did you run generateRouteUtils before ?",
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
  ) {}

  static from(data: PageContextInterface): PageContextData {
    const islandMap = new Map<FunctionComponent<any>, IslandEntry>();
    for (const island of data.islands ?? []) {
      islandMap.set(island.component, island);
    }

    return new PageContextData(data.base ?? "", islandMap);
  }
}

export class UtilsContextData {
  constructor(
    public page: PageFunction = defaultPageFunction,
    public asset: AssetFunction = defaultAssetFunction,
  ) {}

  static from(data: UtilsContextInterface): UtilsContextData {
    return new UtilsContextData(
      data.page ?? defaultPageFunction,
      data.asset ?? defaultAssetFunction,
    );
  }
}

export const PageContext = createContext<PageContextData>(
  new PageContextData(),
);

export const UtilsContext = createContext<UtilsContextData>(
  new UtilsContextData(),
);

/** Wraps a component with both the page (build-time) and utils contexts. */
export function providePageContext(
  data: FullPageContext,
  child: ComponentChild,
) {
  return h(
    PageContext.Provider,
    { value: PageContextData.from(data) },
    h(UtilsContext.Provider, { value: UtilsContextData.from(data) }, child),
  );
}
