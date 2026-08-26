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
import { hydrate, h, render } from "preact";
import type { ComponentType } from "preact";
import * as devalue from "devalue";
import { UtilsContext, UtilsContextData } from "../core/context";
import {
  createClientAssetFunction,
  createClientPageFunction,
} from "../core/url";

/** Hydrates all island elements matching the given hash with the given component. */
export function renderIsland(
  Component: ComponentType<any>,
  hash: string,
  base: string = "",
) {
  const elements = document.querySelectorAll<HTMLElement>(
    `[data-island="${hash}"]`,
  );
  const utilsContextData = new UtilsContextData(
    createClientPageFunction(base),
    createClientAssetFunction(base),
  );

  elements.forEach((element) => {
    const props = devalue.parse(element.getAttribute("data-props") || "[{}]");
    const islandComponent = h(Component, props, []);
    const islandWithProvider = h(
      UtilsContext.Provider,
      { value: utilsContextData },
      islandComponent,
    );

    if (element.childNodes.length === 0) {
      render(islandWithProvider, element);
    } else {
      hydrate(islandWithProvider, element);
    }
  });
}
