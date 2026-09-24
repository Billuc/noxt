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
import { buildUrlWithQuery } from "../core/url";
import type {
  CallerInput,
  Method,
  Route,
  SSRDefinitions,
  SSRFunction,
  SSRRouteDefinitions,
  SSRRoutes,
  SSRUrlFunction,
} from "../ssr/types";
import { copyFetchRequestInit, FetchError, requestFrom } from "./fetch";

export function makeSSRFn<TDefinitions extends SSRDefinitions>(
  base?: string,
): SSRFunction<TDefinitions> {
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
        newOptions.headers.push(["Accept", "text/html"]);
      } else {
        newOptions.headers["Accept"] = "text/html";
      }

      const request = requestFrom(url, newOptions, signal);
      const response = await fetcher(request);

      if (!response.ok) {
        throw new FetchError(response);
      }

      const htmlData = await response.text();
      return htmlData;
    };
  };
}

export function makeSSRUrlFn<TDefinitions extends SSRDefinitions>(
  base?: string,
): SSRUrlFunction<TDefinitions> {
  return <
    TRoute extends Route<TDefinitions>,
    TMethod extends Method<TDefinitions, TRoute>,
  >(
    route: TRoute,
    method: TMethod,
    input: CallerInput<TDefinitions, TRoute, TMethod>,
  ) => {
    const url = (base ?? "") + route;
    const query = method === "GET" ? input : undefined;

    return buildUrlWithQuery(url, query);
  };
}

export function getSSRHandlers<
  TDefinitions extends SSRRouteDefinitions,
  TBase extends string = "",
>(ssrMap: TDefinitions, base?: TBase): SSRRoutes<TDefinitions, TBase> {
  const routes: any = {};

  for (const [route, routeData] of Object.entries(ssrMap)) {
    const handlers: any = {};
    for (const [method, endpoint] of Object.entries(routeData)) {
      handlers[method as keyof typeof handlers] = endpoint.handler;
    }
    routes[(base ?? "") + route] = handlers;
  }

  return routes;
}
