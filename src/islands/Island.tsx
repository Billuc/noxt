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
import type { FunctionComponent } from "preact";
import { h, Fragment } from "preact";
import { useContext } from "preact/hooks";
import * as devalue from "devalue";
import { toPublicPath } from "../core/utils";
import { PageContext } from "../core/context";
import { CACHE_DIR } from "../core/fs";
import { IslandErrorBoundary } from "./ErrorBoundary";

type Props<T> = h.JSX.IntrinsicAttributes & {
  component: FunctionComponent<T>;
  props: T;
  "client:only"?: boolean;
};

export function Island<T>(props: Props<T>) {
  const { component: Component, props: finalProps, key } = props;
  const { base, islandMap } = useContext(PageContext);

  const entry = islandMap.get(Component);
  if (!entry) {
    throw new Error(
      `Component "${Component.displayName ?? Component.name}" has not been prerendered as an island. ` +
        "Make sure prerenderIslands() is called before prerenderPages().",
    );
  }

  const scripts = [];
  const cssLinks = [];

  for (const file of entry.files) {
    const pathFromCache = file.relativeTo(CACHE_DIR);
    if (/.*\.(js|jsx|ts|tsx)$/.test(pathFromCache)) {
      scripts.push(
        <script type="module" src={toPublicPath(pathFromCache, base)}></script>,
      );
    } else if (pathFromCache.endsWith(".css")) {
      cssLinks.push(
        <link rel="stylesheet" href={toPublicPath(pathFromCache, base)}></link>,
      );
    }
  }

  return (
    <>
      <div data-island={entry.hash} data-props={devalue.stringify(finalProps)}>
        {props["client:only"] ? null : (
          <IslandErrorBoundary name={Component.displayName ?? Component.name}>
            <Component key={key} {...finalProps} />
          </IslandErrorBoundary>
        )}
      </div>
      {scripts}
      {cssLinks}
    </>
  );
}
