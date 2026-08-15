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
import { BaseProvider, IslandMapProvider } from "../core/context";
import { renderToHtmlString } from "../core/render";
import { sanitizePrerendered } from "../core/utils";
import type { IslandEntry } from "../islands";

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
): Promise<string> {
  let element: any = h(component, {}, []);
  if (base !== undefined) {
    element = h(BaseProvider, { value: base }, element);
  }
  if (islandEntries !== undefined) {
    element = h(IslandMapProvider, { entries: islandEntries }, element);
  }
  const content = await renderToHtmlString(element);
  return sanitizePrerendered(content);
}
