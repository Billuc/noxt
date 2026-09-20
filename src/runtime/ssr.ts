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
import type { SSRRouteDefinitions, SSRRoutes } from "../ssr/types";

export function getSSRHandlers<TDefinitions extends SSRRouteDefinitions>(
  ssrMap: TDefinitions,
  base: string = "",
): SSRRoutes<TDefinitions> {
  const routes: any = {};

  for (const [route, routeData] of Object.entries(ssrMap)) {
    const handlers: any = {};
    for (const [method, endpoint] of Object.entries(routeData)) {
      handlers[method as keyof typeof handlers] = endpoint.handler;
    }
    routes[base + route] = handlers;
  }

  return routes;
}
