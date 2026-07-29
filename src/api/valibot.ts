import * as v from "valibot";
import type { SearchParamSchema, SomeSchema } from "./types";

type DecodedSearchParamsValue = number | bigint | boolean | string;
type DecodedSearchParams = Record<
  string,
  DecodedSearchParamsValue | DecodedSearchParamsValue[]
>;

export function searchParams<TSchema extends SearchParamSchema>(
  Schema: TSchema,
): v.GenericSchema<URLSearchParams, v.InferOutput<TSchema>, any> {
  return v.pipe(
    v.custom<URLSearchParams>((params) => params instanceof URLSearchParams),
    v.transform((data) => parseSearchParams(Schema, data)),
  ) as v.GenericSchema<URLSearchParams, v.InferOutput<TSchema>, any>;
}

function parseSearchParams<TSchema extends SearchParamSchema>(
  Schema: TSchema,
  searchParams: URLSearchParams,
): v.InferOutput<TSchema> {
  const decoded: DecodedSearchParams = {};

  for (let [key, field] of Object.entries(Schema.entries)) {
    const Field = unwrapSchema(field);
    const fieldValues = searchParams.getAll(key);

    if (v.isOfType("array", Field)) {
      const Item = (Field as v.ArraySchema<SomeSchema, any>).item;
      decoded[key] = (fieldValues ?? []).map((s) => parseValue(s, Item));
    } else {
      const fieldValue = fieldValues?.[0];
      if (!fieldValue) continue;
      decoded[key] = parseValue(fieldValue, Field);
    }
  }

  return v.parse(Schema, searchParams);
}

function unwrapSchema(Schema: SomeSchema): SomeSchema {
  if (v.isOfType("optional", Schema)) {
    return v.unwrap(Schema as v.OptionalSchema<v.UnknownSchema, undefined>);
  }
  return Schema;
}

function parseValue(str: string, Schema: SomeSchema): DecodedSearchParamsValue {
  const Base = unwrapSchema(Schema);
  if (v.isOfType("boolean", Base)) return str === "true";
  if (v.isOfType("number", Base)) return Number(str);
  if (v.isOfType("bigint", Base)) return BigInt(str);
  if (v.isOfType("string", Base)) return str;
  return str;
}

export function body<TSchema extends SomeSchema>(
  Schema: TSchema,
): v.GenericSchema<string, v.InferOutput<TSchema>, any> {
  return v.pipe(
    v.string(),
    v.parseJson(),
    v.transform((data) => v.parse(Schema, data)),
  );
}
