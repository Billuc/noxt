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
import * as v from "valibot";
import { requestFrom, useAsync } from "./fetch";
import type { HttpMethod } from "../api/types";

type EndpointDefinition = {
  input: v.GenericSchema;
  output: v.GenericSchema;
};

type KeyOf<T> =
  T extends Record<infer K, any>
    ? K
    : T extends Partial<Record<infer K, any>>
      ? keyof T
      : string | number | symbol;

export type ApiDefinitions = Record<
  string,
  Partial<Record<HttpMethod, EndpointDefinition>>
>;
type Route<TDefinitions extends ApiDefinitions> = KeyOf<TDefinitions>;
type Method<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
> = KeyOf<TDefinitions[TRoute]>;

type CallerInput<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
  TMethod extends Method<TDefinitions, TRoute>,
> = v.InferOutput<NonNullable<TDefinitions[TRoute][TMethod]>["input"]>;
type CallerOutput<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
  TMethod extends Method<TDefinitions, TRoute>,
> = v.InferInput<NonNullable<TDefinitions[TRoute][TMethod]>["output"]>;
type EndpointCaller<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
  TMethod extends Method<TDefinitions, TRoute>,
> = (
  input: CallerInput<TDefinitions, TRoute, TMethod>,
  options?: RequestInit | undefined,
) => Promise<CallerOutput<TDefinitions, TRoute, TMethod>>;

export class ApiRouter<TDefinitions extends ApiDefinitions> {
  constructor(
    private base?: string,
    private fetcher: (request: Request) => Promise<Response> = fetch,
  ) {}

  api<
    TRoute extends Route<TDefinitions>,
    TMethod extends Method<TDefinitions, TRoute>,
  >(
    route: TRoute,
    method: TMethod,
  ): EndpointCaller<TDefinitions, TRoute, TMethod> {
    return async (input, options) => {
      const url = (this.base ?? "") + route;

      const request = requestFrom(url, {
        ...options,
        objectBody: input,
        method,
      });
      const response = await this.fetcher(request);
      const data = await response.json();

      return data as v.InferInput<
        NonNullable<ApiDefinitions[TRoute][TMethod]>["output"]
      >;
    };
  }
}

export function useApi<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
  TMethod extends Method<TDefinitions, TRoute>,
>(
  endpointCaller: EndpointCaller<TDefinitions, TRoute, TMethod>,
  input: CallerInput<TDefinitions, TRoute, TMethod>,
  options?: RequestInit,
) {
  return useAsync({ input, options }, async ({ input, options }, signal) => {
    return endpointCaller(input, { ...options, signal });
  });
}
