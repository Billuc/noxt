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
import path from "path";
import {
  h,
  type ComponentChildren,
  type ComponentType,
  type JSX,
} from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import type { NoxtConfig } from "./config";
import { copyAssets } from "./assets";
import { prepareIslands, type IslandData } from "./island";
import { html } from "htm/preact/index.js";

/**
 * Creates a Bun.build plugin that transforms island imports into placeholder divs with hydration scripts.
 *
 * This plugin intercepts imports from the islands directory and replaces them with code that:
 * - Renders a placeholder div with data-island and data-props attributes
 * - Adds a script tag to load the island's client-side code
 * - Preserves the component's props for client-side hydration
 *
 * @param config - Noxt configuration object
 * @param islandsData - Map of island file paths to their IslandData
 * @returns A Bun.BunPlugin that transforms island imports
 */
function createIslandPreparePlugin(
  config: NoxtConfig,
  islandsData: Record<string, IslandData>,
) {
  const islandsDir = path.resolve(config.root, config.islandsDir);
  const islandScriptRegexp = new RegExp(`^${islandsDir}[\/](.*)\.[tj]sx?$`);

  const islandPreparePlugin: Bun.BunPlugin = {
    name: "island-prepare-plugin",
    setup: (build) => {
      build.onLoad({ filter: islandScriptRegexp }, async (args) => {
        const islandData = islandsData[args.path];
        if (!islandData) return undefined;

        return {
          loader: "js",
          contents: `
            import { html } from "htm/preact";
            return (props) => html\`
              <div data-island="${islandData.hash}" data-props="\${JSON.stringify(props)}"></div>
              <script type="module" src="${islandData.prerenderPath}"></script>
            \`;
          `,
        };
      });
    },
  };
  return islandPreparePlugin;
}

/**
 * Converts a file path from pages directory to a route name.
 * Removes file extension and handles 'index' specially.
 *
 * @param pathFromPages - Relative path from the pages directory
 * @returns Route name (e.g., "about.md" -> "/about", "index.md" -> "/")
 */
function getRouteName(pathFromPages: string): string {
  const basename = pathFromPages.replace(/\.(tsx|ts|jsx|js|md)$/, "");
  return "/" + (basename.endsWith("index") ? basename.slice(0, -5) : basename);
}

/**
 * Gets the cache directory path for pages.
 *
 * @param config - Noxt configuration object
 * @returns Absolute path to the cache pages directory
 */
function getCachePagesDir(config: NoxtConfig): string {
  return path.resolve(config.root, ".cache", config.pagesDir);
}

/**
 * Gets the full path to a page file.
 *
 * @param config - Noxt configuration object
 * @param pathFromPages - Relative path from the pages directory
 * @returns Absolute file path
 */
function getPageFilePath(config: NoxtConfig, pathFromPages: string): string {
  const pagesDir = path.resolve(config.root, config.pagesDir);
  return path.join(pagesDir, pathFromPages);
}

/**
 * Writes HTML content to the cache directory.
 *
 * @param cachePagesDir - Cache pages directory
 * @param basename - File name without extension
 * @param content - HTML content to write
 * @returns Absolute path to the written HTML file
 */
async function writeHtmlFile(
  cachePagesDir: string,
  basename: string,
  content: string,
): Promise<string> {
  const prerenderPath = path.resolve(cachePagesDir, `${basename}.html`);
  await Bun.write(prerenderPath, content);
  return prerenderPath;
}

/**
 * Renders a Preact component to HTML string with DOCTYPE.
 *
 * @param component - Preact component to render
 * @returns HTML string with DOCTYPE
 */
async function renderPageToHtml(
  component: preact.ComponentType,
): Promise<string> {
  const prerenderedContent = await renderToStringAsync(h(component, {}, []));
  return "<!DOCTYPE html>" + prerenderedContent;
}

/**
 * Renders Markdown content to HTML string with DOCTYPE.
 *
 * @param markdownContent - Markdown content to convert
 * @returns HTML string with DOCTYPE
 */
async function renderMarkdownToHtml(
  markdownContent: string,
  Layout: ComponentType<Record<string, any>>,
  frontmatterData: Record<string, any>,
): Promise<string> {
  const markdownComponent = Bun.markdown.react(markdownContent) as JSX.Element;
  const fullPage = h(Layout, frontmatterData, markdownComponent);
  const htmlContent = await renderToStringAsync(fullPage);
  return "<!DOCTYPE html>" + htmlContent;
}

/**
 * Prerenders a single page component to HTML.
 *
 * This function:
 * - Builds the page component with the island prepare plugin
 * - Renders the output to HTML using Preact
 * - Wraps the HTML in a DOCTYPE declaration
 * - Generates a route name based on the file path
 * - Saves the HTML to the cache directory
 *
 * @param config - Noxt configuration object
 * @param islandsData - Map of island file paths to their IslandData
 * @param pathFromPages - Relative path of the page from the pages directory
 * @returns Promise resolving to route name and prerender path, or null if page has no default export
 */
async function prerenderPage(
  config: NoxtConfig,
  islandsData: Record<string, IslandData>,
  pathFromPages: string,
): Promise<{ routeName: string; prerenderPath: string } | null> {
  const basename = pathFromPages.replace(/\.(tsx|ts|jsx|js)$/, "");
  console.log(`Prerendering page [${basename}]`);

  const cachePagesDir = getCachePagesDir(config);
  const filePath = getPageFilePath(config, pathFromPages);

  const buildResult = await Bun.build({
    entrypoints: [filePath],
    outdir: cachePagesDir,
    plugins: [createIslandPreparePlugin(config, islandsData)],
    packages: "external",
  });

  if (!buildResult.success) {
    const logsMessages = buildResult.logs
      .map((msg) => `[${msg.level}] ${msg.message}`)
      .join("\n");
    throw new Error("Prerendering failed with message: " + logsMessages);
  }

  const { default: Page } = await import(buildResult.outputs[0]!.path);

  if (!Page) {
    console.log(
      `Skipping ${pathFromPages} because it does not have a default export.`,
    );
    return null;
  }

  const htmlContent = await renderPageToHtml(Page);
  const prerenderPath = await writeHtmlFile(
    cachePagesDir,
    basename,
    htmlContent,
  );
  const routeName = getRouteName(pathFromPages);

  return { routeName, prerenderPath };
}

function parseFrontmatter(frontmatterContent: string): Record<string, any> {
  const frontmatterData = Bun.YAML.parse(frontmatterContent);
  if (!(frontmatterData instanceof Object)) return {};
  return frontmatterData;
}

function splitMarkdownAndFrontmatter(
  markdownContent: string,
): [string, string] {
  if (!markdownContent.startsWith("---\n")) {
    return ["", markdownContent];
  }

  const frontmatterEnd = markdownContent.indexOf("---\n", 4);
  if (!frontmatterEnd) return ["", markdownContent];

  return [
    markdownContent.slice(4, frontmatterEnd),
    markdownContent.slice(frontmatterEnd + 4),
  ];
}

function DefaultMarkdownLayout({ children }: { children?: ComponentChildren }) {
  return html`<html>
    <head></head>
    <body>
      ${children}
    </body>
  </html>`;
}

async function findMarkdownLayout(
  config: NoxtConfig,
  frontmatterData: Record<string, any>,
): Promise<ComponentType<Record<string, any>>> {
  const layoutPath = frontmatterData["layout"];
  if (!layoutPath) {
    return DefaultMarkdownLayout;
  }
  const absoluteLayoutPath = path.resolve(config.root, layoutPath);
  const layoutExports = await import(absoluteLayoutPath);
  const Layout = layoutExports.default;
  if (!Layout) {
    throw new Error(
      `Layout component file at ${layoutPath} has no default export !`,
    );
  }
  return Layout as ComponentType<Record<string, any>>;
}

/**
 * Prerenders a Markdown file to HTML.
 *
 * This function:
 * - Reads the Markdown file content
 * - Converts Markdown to HTML using Bun's built-in markdown parser
 * - Wraps the HTML in a DOCTYPE declaration
 * - Generates a route name based on the file path
 * - Saves the HTML to the cache directory
 *
 * @param config - Noxt configuration object
 * @param pathFromPages - Relative path of the markdown file from the pages directory
 * @returns Promise resolving to route name and prerender path
 */
async function prerenderMarkdown(
  config: NoxtConfig,
  pathFromPages: string,
): Promise<{ routeName: string; prerenderPath: string }> {
  const basename = pathFromPages.replace(/\.md$/, "");
  console.log(`Prerendering markdown [${basename}]`);

  const cachePagesDir = getCachePagesDir(config);
  const filePath = getPageFilePath(config, pathFromPages);

  const content = await Bun.file(filePath).text();
  const [frontmatterContent, markdownContent] =
    splitMarkdownAndFrontmatter(content);
  const frontmatterData = parseFrontmatter(frontmatterContent);
  const Layout = await findMarkdownLayout(config, frontmatterData);
  const htmlContent = await renderMarkdownToHtml(
    markdownContent,
    Layout,
    frontmatterData,
  );
  const prerenderPath = await writeHtmlFile(
    cachePagesDir,
    basename,
    htmlContent,
  );
  const routeName = getRouteName(pathFromPages);

  return { routeName, prerenderPath };
}

/**
 * Prepares the manifest by prerendering all pages and copying assets.
 *
 * This function:
 * - Copies assets from assetsDir to cache/assetsDir
 * - Prepares all island components for client-side hydration
 * - Scans the pages directory for page components and markdown files
 * - Prerenders each page to HTML with island placeholders
 * - Returns a mapping of routes to their HTML file paths
 *
 * @param config - Noxt configuration object
 * @returns Promise resolving to a record mapping route names to their prerendered HTML file paths
 *
 * @example
 * ```ts
 * import { prepareManifest, buildConfig } from "noxt";
 *
 * const config = buildConfig({});
 * const manifest = await prepareManifest(config);
 * // manifest = { "/": ".cache/pages/index.html", "/about": ".cache/pages/about.html", ... }
 * ```
 */
export async function prepareManifest(
  config: NoxtConfig,
): Promise<Record<string, string>> {
  const pagesDir = path.resolve(config.root, config.pagesDir);

  await copyAssets(config);
  const islandsData = await prepareIslands(config);

  const manifest: Record<string, string> = {};
  const glob = new Bun.Glob("**/*.{tsx,ts,jsx,js,md}");

  for await (const file of glob.scan(pagesDir)) {
    if (file.endsWith(".md")) {
      const result = await prerenderMarkdown(config, file);
      manifest[result.routeName] = result.prerenderPath;
    } else {
      const prerenderResult = await prerenderPage(config, islandsData, file);
      if (!prerenderResult) continue;

      const { routeName, prerenderPath } = prerenderResult;
      manifest[routeName] = prerenderPath;
    }
  }

  return manifest;
}
