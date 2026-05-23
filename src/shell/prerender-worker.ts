import type { NoxtConfig } from "../core/config";
import { cachePagesDir, distPagesDir } from "../core/paths";
import {
  renderPageToHtml,
  getRouteName,
  parseMarkdown,
  renderMarkdownToHtml,
} from "../core/rendering";
import { type IslandData, createIslandPreparePlugin } from "./island";
import path, { extname } from "node:path";
import { readFile, type RelativePath } from "./fs";
import type { ComponentChildren, ComponentType } from "preact";
import { html } from "htm/preact";

interface RouteData {
  filePath: string;
  prerenderedPage: string;
}

async function preparePreactComponent(
  config: NoxtConfig,
  path: RelativePath,
  islandsPlugin: Bun.BunPlugin,
): Promise<ComponentType | null> {
  const buildResult = await Bun.build({
    entrypoints: [path.absolute],
    outdir: cachePagesDir(config),
    plugins: [islandsPlugin],
    packages: "external",
  });

  if (!buildResult.success) {
    const logsMessages = buildResult.logs
      .map((msg) => `[${msg.level}] ${msg.message}`)
      .join("\n");
    console.error("Prerendering failed with message: " + logsMessages);
    return null;
  }

  const { default: Component } = await import(buildResult.outputs[0]!.path);

  if (!Component) {
    console.error(
      `Skipping ${path.fromRoot} because it does not have a default export.`,
    );
    return null;
  }

  return Component;
}

function DefaultMarkdownLayout({ children }: { children?: ComponentChildren }) {
  return html`<html>
    <head></head>
    <body>
      ${children}
    </body>
  </html>`;
}

async function findAndPrepareMarkdownLayout(
  config: NoxtConfig,
  frontmatterData: Record<string, any>,
  islandsPlugin: Bun.BunPlugin,
): Promise<ComponentType<Record<string, any>> | null> {
  const layoutPath = frontmatterData["layout"];
  if (!layoutPath) {
    return DefaultMarkdownLayout;
  }

  const Layout = await preparePreactComponent(
    config,
    {
      absolute: path.resolve(config.root, layoutPath),
      fromRoot: layoutPath,
    },
    islandsPlugin,
  );
  return Layout as ComponentType<Record<string, any>> | null;
}

async function optimizeHtmlPages(
  config: NoxtConfig,
  htmlContents: RouteData[],
): Promise<{ routeName: string; prerenderPath: string }[]> {
  const files: Record<string, string> = {};
  for (const route of htmlContents) {
    files[route.filePath + ".html"] = route.prerenderedPage;
  }

  const results = await Bun.build({
    entrypoints: Object.keys(files),
    files: files,
    outdir: distPagesDir(config),
    target: "browser",
    splitting: true,
    minify: true,
    external: ["preact", "htm/preact", "preact/hooks"],
  });

  const routes = [];
  for (const res of results.outputs) {
    const routeName = getRouteName(
      path.relative(distPagesDir(config), res.path),
    );
    const prerenderPath = path.relative(config.root, res.path);
    routes.push({ routeName, prerenderPath });
  }

  return routes;
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
  pathFromPages: RelativePath,
  islandsPlugin: Bun.BunPlugin,
): Promise<RouteData | null> {
  const extension = extname(pathFromPages.fromRoot);
  const basename = pathFromPages.fromRoot.slice(0, -extension.length);
  console.log(`Prerendering page [${basename}]`);

  if (extension === ".md") {
    let content = await readFile(pathFromPages.absolute);
    content = content.replaceAll("\r\n", "\n");
    const markdownData = parseMarkdown(content);

    const Layout = await findAndPrepareMarkdownLayout(
      config,
      markdownData.frontmatter,
      islandsPlugin,
    );
    if (!Layout) return null;

    const prerenderedPage = await renderMarkdownToHtml(markdownData, Layout);
    return { filePath: basename, prerenderedPage };
  } else {
    const Page = await preparePreactComponent(
      config,
      pathFromPages,
      islandsPlugin,
    );
    if (!Page) return null;

    const prerenderedPage = await renderPageToHtml(Page);
    return { filePath: basename, prerenderedPage };
  }
}

declare var self: Worker;

let config: NoxtConfig | undefined = undefined;
let islandDataMap: Record<string, IslandData> | undefined = undefined;
let prerenderingPromises: Promise<RouteData | null>[] = [];

self.addEventListener("message", (msg) => {
  if (typeof msg.data !== "object") return;
  if (!msg.data["type"]) return;

  switch (msg.data["type"]) {
    case "config":
      config = msg.data["data"] as NoxtConfig | undefined;
      break;
    case "islands":
      islandDataMap = msg.data["data"] as
        | Record<string, IslandData>
        | undefined;
      break;
    case "prerender":
      if (!config || !islandDataMap) return;
      const islandPlugin = createIslandPreparePlugin(config, islandDataMap);
      prerenderingPromises = (msg.data["data"] as RelativePath[]).map((path) =>
        prerenderPage(config!, path, islandPlugin),
      );
      break;
    case "start":
      Promise.allSettled(prerenderingPromises)
        .then((results) =>
          results
            .filter((r) => r.status === "fulfilled")
            .map((r) => r.value)
            .filter((r) => r !== null),
        )
        .then((routeData) => optimizeHtmlPages(config!, routeData))
        .then((routesData) => {
          self.postMessage(routesData);
        });
      break;
    default:
      break;
  }
});
