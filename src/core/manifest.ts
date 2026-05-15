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
import { h, type ComponentType } from "preact";
import { renderToStringAsync } from "preact-render-to-string";

/**
 * Converts a file path from pages directory to a route name.
 * Removes file extension and handles 'index' specially.
 *
 * @param pathFromPages - Relative path from the pages directory
 * @returns Route name (e.g., "about.md" -> "/about", "index.md" -> "/")
 */
export function getRouteName(pathFromPages: string): string {
  const basename = pathFromPages
    .replace(/\.(tsx|ts|jsx|js|md)$/, "")
    .replaceAll("\\", "/");
  return "/" + (basename.endsWith("index") ? basename.slice(0, -5) : basename);
}

/**
 * Renders a Preact component to HTML string with DOCTYPE.
 *
 * @param component - Preact component to render
 * @returns HTML string with DOCTYPE
 */
export async function renderPageToHtml(
  component: preact.ComponentType,
): Promise<string> {
  const prerenderedContent = await renderToStringAsync(h(component, {}, []));
  return "<!DOCTYPE html>" + prerenderedContent;
}

interface MarkdownData {
  frontmatter: Record<string, any>;
  content: string;
}

const MARKDOWN_PLACEHOLDER = "---MARKDOWN:CHILDREN---";

/**
 * Renders Markdown content to HTML string with DOCTYPE.
 *
 * @param markdownContent - Markdown content to convert
 * @returns HTML string with DOCTYPE
 */
export async function renderMarkdownToHtml(
  markdownData: MarkdownData,
  Layout: ComponentType<Record<string, any>>,
): Promise<string> {
  const markdownHTML = Bun.markdown.html(markdownData.content);

  const fullPage = h(Layout, markdownData.frontmatter, MARKDOWN_PLACEHOLDER);
  let htmlContent = await renderToStringAsync(fullPage);
  htmlContent = htmlContent.replace(MARKDOWN_PLACEHOLDER, markdownHTML);
  return "<!DOCTYPE html>" + htmlContent;
}

function parseFrontmatter(frontmatterContent: string): Record<string, any> {
  const frontmatterData = Bun.YAML.parse(frontmatterContent);
  if (!(frontmatterData instanceof Object)) return {};
  return frontmatterData;
}

export function parseMarkdown(markdown: string): MarkdownData {
  if (!markdown.startsWith("---\n")) {
    return {
      frontmatter: {},
      content: markdown,
    };
  }

  const frontmatterEnd = markdown.indexOf("---\n", 4);
  if (!frontmatterEnd) {
    return {
      frontmatter: {},
      content: markdown,
    };
  }

  const frontmatterContent = markdown.slice(4, frontmatterEnd);
  const markdownContent = markdown.slice(frontmatterEnd + 4);

  return {
    frontmatter: parseFrontmatter(frontmatterContent),
    content: markdownContent,
  };
}
