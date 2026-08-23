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
  return JSON.stringify(body);
}
