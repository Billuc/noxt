import { z } from "zod";

type SearchParamsSchema = z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString>>;
type SearchParamValueSchema =
  | z.ZodNumber
  | z.ZodBigInt
  | z.ZodBoolean
  | z.ZodString;
export type SearchParamObjectSchema = z.ZodObject<{
  [k: string]:
    | SearchParamValueSchema
    | z.ZodArray<SearchParamValueSchema>
    | z.ZodOptional<SearchParamValueSchema>
    | z.ZodDefault<SearchParamValueSchema>;
}>;

type DecodedSearchParamsValue = number | bigint | boolean | string;
type DecodedSearchParams = Record<
  string,
  DecodedSearchParamsValue | DecodedSearchParamsValue[]
>;

export function searchParamCodec<T extends SearchParamObjectSchema>(
  schema: T,
): z.ZodCodec<SearchParamsSchema, T> {
  return z.codec(z.record(z.string(), z.array(z.string())), schema, {
    decode: (value, _payload) => {
      const shape = schema.shape;
      const decoded: DecodedSearchParams = {};

      for (const [key, valueSchema] of Object.entries(shape)) {
        const unwrappedSchema = unwrapSchema(valueSchema);
        const fieldValues = value[key];

        if (unwrappedSchema instanceof z.ZodArray) {
          decoded[key] = (fieldValues ?? []).map((s) =>
            parseValue(s, unwrappedSchema.element),
          );
        } else {
          const fieldValue = fieldValues?.[0];
          if (!fieldValue) continue;
          decoded[key] = parseValue(fieldValue, unwrappedSchema);
        }
      }

      return schema.parse(decoded) as any;
    },
    encode: (value, _payload) => {
      const valueEntries = Object.entries(value);
      const searchParamsEntries = valueEntries.map(([k, v]) => [
        k,
        toSearchParam(v),
      ]);
      return Object.fromEntries(searchParamsEntries);
    },
  });
}

function toSearchParam(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(toSearchParam);
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

function unwrapSchema(s: z.core.$ZodType): z.core.$ZodType {
  if (s instanceof z.ZodOptional || s instanceof z.ZodDefault) {
    return unwrapSchema(s.unwrap());
  }
  return s;
}

function parseValue(str: string, s: z.core.$ZodType): DecodedSearchParamsValue {
  const base = unwrapSchema(s);
  if (base instanceof z.ZodBoolean) return str === "true";
  if (base instanceof z.ZodNumber) return Number(str);
  if (base instanceof z.ZodBigInt) return BigInt(str);
  if (base instanceof z.ZodString) return str;
  return str;
}

export function jsonCodec<T extends z.ZodObject>(
  schema: T,
): z.ZodCodec<z.ZodString, T> {
  return z.codec(z.string(), schema, {
    decode: async (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (err: any) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err.message,
        });
        return z.NEVER;
      }
    },
    encode: (value, _payload) => {
      return JSON.stringify(value);
    },
  });
}
