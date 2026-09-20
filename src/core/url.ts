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
import type { PageFunction, QueryParams } from "./types";
import type { AssetFunction } from "../assets/types";
import * as devalue from "devalue";

/** Appends the given query params to a URL path as a query string. */
export function buildUrlWithQuery(url: string, query?: QueryParams): string {
  if (!query) return url;
  const entries = Object.entries(query);
  if (entries.length === 0) return url;
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    params.append(key, String(value));
  }
  return url + "?" + params.toString();
}

/** Creates a client-side page function that prefixes pages with the base. */
export function createClientPageFunction(base: string): PageFunction {
  return (pageId: string, query?: QueryParams) =>
    buildUrlWithQuery(base + pageId, query);
}

/** Creates a client-side asset function that prefixes assets with the base. */
export function createClientAssetFunction(base: string): AssetFunction {
  return (assetId: string) => base + assetId;
}

export function toSearchParam(input: { [k: string]: unknown }): {
  [k: string]: string[];
} {
  const result: { [k: string]: string[] } = {};
  for (const k in input) {
    result[k] = toSearchParamValue(input[k]);
  }
  return result;
}

function toSearchParamValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(toSearchParamValue);
  }

  switch (typeof value) {
    case "bigint":
      return [value.toString()];
    case "boolean":
      return [value ? "true" : "false"];
    case "number":
      return [value.toString()];
    case "string":
      return [value];
    default:
      return [];
  }
}

export function toBody(body: unknown): string | undefined {
  return devalue.stringify(body);
}
