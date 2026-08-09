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
import { requestFrom, useAsync, type FetchRequestInit } from "./fetch";
import { useMemo } from "preact/hooks";
import type {
  ApiEndpointDefinitions,
  ApiDefinitions,
  ApiEndpoints,
} from "../api/types";

type KeyOf<T> =
  T extends Record<infer K, any>
    ? K
    : T extends Partial<Record<any, any>>
      ? keyof T
      : string | number | symbol;

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
  options?: FetchRequestInit | undefined,
  signal?: AbortSignal,
) => Promise<CallerOutput<TDefinitions, TRoute, TMethod>>;

export class ApiRouter<TDefinitions extends ApiDefinitions> {
  constructor(private base?: string) {}

  api<
    TRoute extends Route<TDefinitions>,
    TMethod extends Method<TDefinitions, TRoute>,
  >(
    route: TRoute,
    method: TMethod,
    fetcher: (request: Request) => Promise<Response> = fetch,
  ): EndpointCaller<TDefinitions, TRoute, TMethod> {
    return async (input, options, signal) => {
      const url = (this.base ?? "") + route;

      const newOptions: FetchRequestInit = { method, objectBody: input };

      if (options) {
        const headers = options.headers;
        newOptions.headers =
          headers instanceof Headers ? headers.toJSON() : headers;

        if (!!options.method && options.method !== method) {
          console.warn(
            `Method ${options.method} passed in options for endpoint "${method} ${route}" ! Ignoring...`,
          );
        }

        newOptions.cache = options.cache;
        newOptions.credentials = options.credentials;
        newOptions.integrity = options.integrity;
        newOptions.keepalive = options.keepalive;
        newOptions.mode = options.mode;
        newOptions.redirect = options.redirect;
        newOptions.referrer = options.referrer;
        newOptions.referrerPolicy = options.referrerPolicy;
      }

      const request = requestFrom(url, newOptions, signal);
      const response = await fetcher(request);
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
  options?: FetchRequestInit,
) {
  const key = useMemo(() => JSON.stringify([input, options]), [input, options]);
  const memoizedData = useMemo(() => ({ input, options }), [key]);

  return useAsync(memoizedData, ({ input, options }, signal) =>
    endpointCaller(input, options, signal),
  );
}

export function getApiHandlers<TDefinitions extends ApiEndpointDefinitions>(
  apiMap: TDefinitions,
): ApiEndpoints<TDefinitions> {
  const routes: any = {};

  for (const [route, routeData] of Object.entries(apiMap)) {
    const handlers: any = {};
    for (const [method, endpoint] of Object.entries(routeData)) {
      handlers[method as keyof typeof handlers] = endpoint.handler;
    }
    routes[route] = handlers;
  }

  return routes;
}
