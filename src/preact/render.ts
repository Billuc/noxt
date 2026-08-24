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
import { h } from "preact";
import { PageContext, PageContextData } from "../core/context";
import { renderToHtmlString } from "../core/render";
import { sanitizePrerendered } from "../core/utils";
import type { IslandEntry } from "../islands";
import type { AssetFunction } from "../assets/types";
import type { PageFunction } from "../core/types";

/**
 * Renders a Preact component to HTML string with DOCTYPE.
 *
 * @param component - Preact component to render
 * @returns HTML string with DOCTYPE
 */
export async function renderPreactToHtml(
  component: preact.ComponentType,
  base?: string,
  islandEntries?: IslandEntry[],
  asset?: AssetFunction,
  page?: PageFunction,
): Promise<string> {
  const contextData = PageContextData.from({
    base,
    islands: islandEntries,
    asset,
    page,
  });
  const fullPage = h(
    PageContext.Provider,
    { value: contextData },
    h(component, {}, []),
  );

  const content = await renderToHtmlString(fullPage);
  return sanitizePrerendered(content);
}
