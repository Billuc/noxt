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
import * as s from "superstruct";
import type { SearchParamSchema, SomeSchema } from "./types";

type DecodedSearchParamsValue = number | bigint | boolean | string;
type DecodedSearchParams = Record<
  string,
  DecodedSearchParamsValue | DecodedSearchParamsValue[]
>;

const URLSearchParamsStruct = s.define(
  "URLSearchParams",
  (v) => v instanceof URLSearchParams,
);

function isOptionalStruct(struct: s.Struct<any, any>): boolean {
  // superstruct optional allows undefined
  try {
    return s.is(undefined, struct as any);
  } catch {
    return false;
  }
}

function isArrayStruct(struct: s.Struct<any, any>): boolean {
  return (struct as any).type === "array";
}

function getArrayItem(struct: s.Struct<any, any>): s.Struct<any, any> {
  return (struct as any).schema as s.Struct<any, any>;
}

function parseValue(str: string, Schema: SomeSchema): DecodedSearchParamsValue {
  const type = (Schema as any).type as string;
  // For optional structs, type is inner type, so same check works
  if (type === "boolean") return str === "true";
  if (type === "number") return Number(str);
  if (type === "bigint") return BigInt(str);
  if (type === "string") return str;
  // fallback: if type is unknown, try to infer via is checks
  if (s.is(true, Schema as any) && s.is(false, Schema as any)) {
    // heuristic not needed
  }
  return str;
}

function decodeSearchParams(
  Schema: SearchParamSchema,
  searchParams: URLSearchParams,
): Record<string, unknown> {
  const decoded: DecodedSearchParams = {};
  const entries = (Schema as any).schema as Record<string, s.Struct<any, any>>;

  for (const [key, field] of Object.entries(entries)) {
    const fieldValues = searchParams.getAll(key);

    if (isArrayStruct(field as s.Struct<any, any>)) {
      const Item = getArrayItem(field as s.Struct<any, any>);
      decoded[key] = (fieldValues ?? []).map((str) => parseValue(str, Item as SomeSchema));
    } else {
      const fieldValue = fieldValues?.[0];
      if (fieldValue === undefined) {
        // if optional, skip; else let superstruct validation fail for missing required
        if (isOptionalStruct(field as s.Struct<any, any>)) continue;
        continue;
      }
      decoded[key] = parseValue(fieldValue, field as SomeSchema);
    }
  }

  return decoded;
}

export function searchParams<TSchema extends SearchParamSchema>(
  Schema: TSchema,
): s.Struct<s.Infer<TSchema>, unknown> {
  return s.coerce(
    Schema as s.Struct<any, any>,
    URLSearchParamsStruct as s.Struct<URLSearchParams, any>,
    (value) => decodeSearchParams(Schema, value as URLSearchParams),
  ) as unknown as s.Struct<s.Infer<TSchema>, unknown>;
}

export function body<TSchema extends SomeSchema>(
  Schema: TSchema,
): s.Struct<s.Infer<TSchema>, unknown> {
  return s.coerce(
    Schema as s.Struct<any, any>,
    s.string(),
    (value) => JSON.parse(value as string),
  ) as unknown as s.Struct<s.Infer<TSchema>, unknown>;
}
