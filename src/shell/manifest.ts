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
import { type ComponentChildren, type ComponentType } from "preact";
import type { NoxtConfig } from "../core/config";
import { copyAssets } from "../shell/assets";
import {
  prepareIslands,
  createIslandPreparePlugin,
  type IslandData,
} from "./island";
import { html } from "htm/preact/index.js";
import { cachePagesDir, getPageFilePath, pagesDir } from "../core/paths";
import {
  writeFile,
  readFile,
  getFilesMatchingGlob,
  type RelativePath,
} from "./fs";
import {
  getRouteName,
  parseMarkdown,
  renderMarkdownToHtml,
  renderPageToHtml,
} from "../core/rendering";

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
  await writeFile(prerenderPath, content);
  return prerenderPath;
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
export async function prerenderPage(
  config: NoxtConfig,
  islandsData: Record<string, IslandData>,
  pathFromPages: string,
): Promise<{ routeName: string; prerenderPath: string } | null> {
  const basename = pathFromPages.replace(/\.(tsx|ts|jsx|js)$/, "");
  console.log(`Prerendering page [${basename}]`);

  const filePath = getPageFilePath(config, pathFromPages);

  const buildResult = await Bun.build({
    entrypoints: [filePath],
    outdir: cachePagesDir(config),
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
    cachePagesDir(config),
    basename,
    htmlContent,
  );
  const routeName = getRouteName(pathFromPages);

  return { routeName, prerenderPath };
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
export async function prerenderMarkdown(
  config: NoxtConfig,
  pathFromPages: RelativePath,
): Promise<{ routeName: string; prerenderPath: string }> {
  const basename = pathFromPages.fromRoot.replace(/\.md$/, "");
  console.log(`Prerendering markdown [${basename}]`);

  let content = await readFile(pathFromPages.absolute);
  content = content.replaceAll("\r\n", "\n");
  const markdownData = parseMarkdown(content);
  const Layout = await findMarkdownLayout(config, markdownData.frontmatter);
  const htmlContent = await renderMarkdownToHtml(markdownData, Layout);
  const prerenderPath = await writeHtmlFile(
    cachePagesDir(config),
    basename,
    htmlContent,
  );
  const routeName = getRouteName(pathFromPages.fromRoot);

  return { routeName, prerenderPath };
}

async function prerenderAllMarkdown(
  config: NoxtConfig,
): Promise<{ routeName: string; prerenderPath: string }[]> {
  const markdownPagesFiles = await getFilesMatchingGlob(
    "**/*.md",
    pagesDir(config),
  );

  return await Promise.all(
    markdownPagesFiles.map((p) => prerenderMarkdown(config, p)),
  );
}

async function prerenderAllPreact(
  config: NoxtConfig,
  islandsData: Record<string, IslandData>,
): Promise<{ routeName: string; prerenderPath: string }[]> {
  const preactPagesFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js}",
    pagesDir(config),
  );

  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "prerender-preact.ts"));
    worker.postMessage({ type: "config", data: config });
    worker.postMessage({ type: "islands", data: islandsData });
    worker.postMessage({ type: "prerender", data: preactPagesFiles });

    worker.addEventListener("message", (msg) => {
      resolve(msg.data);
    });

    worker.postMessage({ type: "start" });
  });
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
  await copyAssets(config);
  const islandsData = await prepareIslands(config);

  const manifest: Record<string, string> = {};
  const entriesByType = await Promise.all([
    prerenderAllMarkdown(config),
    prerenderAllPreact(config, islandsData),
  ]);

  for (const type of entriesByType) {
    for (const entry of type) {
      manifest[entry.routeName] = entry.prerenderPath;
    }
  }

  return manifest;
}
