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
import { micromark } from "micromark";
import { providePageContext } from "../core/context";
import { renderToHtmlString } from "../core/render";
import { sanitizePrerendered } from "../core/utils";
import type { MarkdownData } from "./types";
import type { IslandEntry } from "../islands";
import { getLayout } from "./layout";
import type { PageFunction } from "../core/types";
import type { AssetFunction } from "../assets/types";

const MARKDOWN_PLACEHOLDER = "---MARKDOWN:CHILDREN---";

/**
 * Renders Markdown content to HTML string with DOCTYPE.
 *
 * @param markdownContent - Markdown content to convert
 * @returns HTML string with DOCTYPE
 */
export async function renderMarkdownToHtml(
  markdownData: MarkdownData,
  base?: string,
  islandEntries?: IslandEntry[],
  asset?: AssetFunction,
  page?: PageFunction,
): Promise<string> {
  const Layout = await getLayout(markdownData.frontmatter);
  const markdownHTML = micromark(markdownData.content);

  const fullPage = providePageContext(
    { base, islands: islandEntries, asset, page },
    h(Layout, markdownData.frontmatter, MARKDOWN_PLACEHOLDER),
  );

  let htmlContent = await renderToHtmlString(fullPage);
  htmlContent = sanitizePrerendered(htmlContent);
  htmlContent = htmlContent.replace(MARKDOWN_PLACEHOLDER, markdownHTML);
  return "<!DOCTYPE html>" + htmlContent;
}
