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

export function toBody(body: unknown): string {
  return JSON.stringify(body);
}
