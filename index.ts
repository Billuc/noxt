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
import { generateRouteMap, generateRouteUtils } from "./src/core/build";
import { BuildPipeline } from "./src/core/types";

import { discoverAPIs, generateAPIFile, query, mutation } from "./src/api";
import type {
  IQueryEndpointBuilder,
  IMutationEndpointBuilder,
  APIEndpoint,
  SearchParamSchema,
} from "./src/api";
import {
  discoverAssets,
  generateAssetUtils,
  type AssetEntry,
} from "./src/assets";
import {
  Island,
  discoverIslands,
  prerenderIslands,
  type IslandEntry,
} from "./src/islands";
import {
  discoverMarkdownPages,
  prerenderMarkdownPages,
  type MarkdownPage,
} from "./src/markdown";
import {
  discoverPreactPages,
  prerenderPreactPages,
  type PreactPage,
} from "./src/preact";
import { generateServiceWorker } from "./src/pwa";
import { generateStaticPages } from "./src/static";

export {
  discoverAPIs,
  generateAPIFile,
  query,
  mutation,
  discoverAssets,
  generateAssetUtils,
  discoverIslands,
  prerenderIslands,
  Island,
  discoverMarkdownPages,
  prerenderMarkdownPages,
  discoverPreactPages,
  prerenderPreactPages,
  generateRouteMap,
  generateRouteUtils,
  generateServiceWorker,
  generateStaticPages,
  BuildPipeline,
};
export type {
  IQueryEndpointBuilder,
  IMutationEndpointBuilder,
  APIEndpoint,
  SearchParamSchema,
  AssetEntry,
  IslandEntry,
  MarkdownPage,
  PreactPage,
};
