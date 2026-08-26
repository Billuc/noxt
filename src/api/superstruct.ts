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
import type { SearchParams, SearchParamSchema, SomeSchema } from "./types";

const numberValue = s.coerce(s.number(), s.string(), (value) =>
  parseFloat(value),
);
const booleanValue = s.coerce(
  s.boolean(),
  s.string(),
  (value) => value === "true",
);
const stringValue = s.string();

const URLSearchParamsStruct: s.Struct<URLSearchParams> = s.define(
  "URLSearchParams",
  (v) => v instanceof URLSearchParams,
);

function makeBaseValueSchema(Schema: SomeSchema): SomeSchema {
  if (s.is(true, Schema)) {
    return booleanValue;
  }
  if (s.is(3.14, Schema)) {
    return numberValue;
  }
  return stringValue;
}

function decodeSearchParams<TSchema extends SearchParams>(
  Schema: SearchParamSchema<TSchema>,
  searchParams: URLSearchParams,
): TSchema {
  const result: any = {};

  for (const k of Object.keys(Schema.schema)) {
    const vSchema = Schema.schema[k]!;
    const paramValues = searchParams.getAll(k);

    if (s.is([], vSchema)) {
      const itemSchema = makeBaseValueSchema(vSchema.schema as SomeSchema);
      result[k] = paramValues.map((v) => s.create(v, itemSchema));
    } else if (s.is(undefined, vSchema)) {
      const itemSchema = makeBaseValueSchema(vSchema);
      result[k] =
        paramValues.length === 0
          ? undefined
          : s.create(paramValues[0], itemSchema);
    } else {
      result[k] = s.create(paramValues[0], makeBaseValueSchema(vSchema));
    }
  }

  return result as TSchema;
}

export function searchParams<TSchema extends SearchParams>(
  Schema: SearchParamSchema<TSchema>,
): s.Struct<TSchema, unknown> {
  return s.coerce(Schema, URLSearchParamsStruct, (value) =>
    decodeSearchParams(Schema, value),
  );
}

export function body<TSchema extends SomeSchema>(
  Schema: TSchema,
): s.Struct<s.Infer<TSchema>, unknown> {
  return s.coerce(Schema, s.string(), (value) => JSON.parse(value));
}
