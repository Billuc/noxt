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
import {
  createContext,
  h,
  type ComponentChildren,
  type FunctionComponent,
} from "preact";
import type { IslandEntry } from "./registry";

export const BaseContext = createContext("");

export function BaseProvider({
  value,
  children,
}: {
  value: string;
  children?: ComponentChildren;
}) {
  return h(BaseContext.Provider, { value }, children);
}

export const IslandMapContext = createContext<
  Map<FunctionComponent<any>, IslandEntry>
>(new Map());

export function IslandMapProvider({
  entries,
  children,
}: {
  entries: IslandEntry[];
  children?: ComponentChildren;
}) {
  const map = new Map<FunctionComponent<any>, IslandEntry>();
  for (const entry of entries) {
    map.set(entry.component, entry);
  }
  return h(IslandMapContext.Provider, { value: map }, children);
}
