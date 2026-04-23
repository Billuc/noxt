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
import type { ComponentType } from "preact";

const ISLAND_PATH = Symbol("island-path");

export type IslandComponent<P = {}> = ComponentType<P> & {
  [ISLAND_PATH]?: string;
};

/**
 * Defines an island component with its module path for server-side rendering.
 *
 * @template T - The props type for the component
 * @param component - The Preact component to define as an island
 * @param modulePath - The module path to the component for SSR hydration
 * @returns The component with island metadata attached
 */
export function defineIsland<T>(
  component: ComponentType<T>,
  modulePath: string,
): IslandComponent<T> {
  Object.defineProperty(component, ISLAND_PATH, {
    value: modulePath,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  return component;
}

export function getIslandPath<P>(island: IslandComponent<P>): string {
  return island[ISLAND_PATH]!;
}
