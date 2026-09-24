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
import * as devalue from "devalue";
import {
  copyFetchRequestInit,
  FetchError,
  requestFrom,
  useAsync,
  type FetchRequestInit,
} from "./fetch";
import { useMemo } from "preact/hooks";
import type {
  ApiEndpointDefinitions,
  ApiDefinitions,
  ApiEndpoints,
  Route,
  Method,
  EndpointCaller,
  CallerInput,
  ApiFunction,
} from "../api/types";

export function makeApiFn<TDefinitions extends ApiDefinitions>(
  base?: string,
): ApiFunction<TDefinitions> {
  return <
    TRoute extends Route<TDefinitions>,
    TMethod extends Method<TDefinitions, TRoute>,
  >(
    route: TRoute,
    method: TMethod,
    fetcher: (request: Request) => Promise<Response> = fetch,
  ) => {
    return async (input, options, signal) => {
      const url = (base ?? "") + route;

      if (!!options?.method && options.method !== method) {
        console.warn(
          `Method ${options.method} passed in options for endpoint "${method} ${route}" ! Ignoring...`,
        );
      }

      const newOptions = copyFetchRequestInit(options ?? {});
      newOptions.method = method;
      newOptions.objectBody = input;

      if (!newOptions.headers) {
        newOptions.headers = {};
      }
      if (newOptions.headers instanceof Array) {
        newOptions.headers.push(["Accept", "application/x-devalue"]);
      } else {
        newOptions.headers["Accept"] = "application/x-devalue";
      }

      const request = requestFrom(url, newOptions, signal);
      const response = await fetcher(request);

      if (!response.ok) {
        throw new FetchError(response);
      }

      const data = await response.text();
      return devalue.parse(data) as s.Infer<
        NonNullable<ApiDefinitions[TRoute][TMethod]>["output"]
      >;
    };
  };
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

export function getApiHandlers<
  TDefinitions extends ApiEndpointDefinitions,
  TBase extends string = "",
>(apiMap: TDefinitions, base?: TBase): ApiEndpoints<TDefinitions, TBase> {
  const routes: any = {};

  for (const [route, routeData] of Object.entries(apiMap)) {
    const handlers: any = {};
    for (const [method, endpoint] of Object.entries(routeData)) {
      handlers[method as keyof typeof handlers] = endpoint.handler;
    }
    routes[(base ?? "") + route] = handlers;
  }

  return routes;
}
