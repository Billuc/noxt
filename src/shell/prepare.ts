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
  renderPageToHtml,
  parseMarkdown,
  renderMarkdownToHtml,
} from "../core/rendering";
import path, { basename } from "node:path";
import * as crypto from "node:crypto";
import { readFile, writeFile } from "./fs";
import type {
  ComponentChildren,
  ComponentType,
  FunctionComponent,
} from "preact";
import { html } from "htm/preact";
import { RelativePath } from "../core/fs";
import { generateScriptForIsland } from "../core/island";
import type { IslandEntry } from "./build";

export async function prepareIsland(
  islandPath: string,
): Promise<IslandEntry | null> {
  const mod = await import(islandPath);
  const Island = mod.default as FunctionComponent<any>;
  if (!Island) {
    console.warn(`Island file ${islandPath} has no default export, skipping`);
    return null;
  }

  const hash = crypto.hash("sha256", islandPath, "base64url");
  const fileName = (Island.displayName ?? Island.name) + "." + hash + ".js";
  const scriptPath = path.resolve(".cache", fileName);

  const scriptContent = generateScriptForIsland(hash, islandPath);
  await writeFile(scriptPath, scriptContent);

  const relPath = RelativePath.fromCwd(scriptPath);

  return {
    component: Island,
    hash,
    files: [relPath],
  };
}

/** Prerenders a Preact page component to HTML and caches it. */
export async function preparePreact(pagePath: string): Promise<RelativePath> {
  const mod = await import(pagePath);
  const Page = mod.default as FunctionComponent<any> | undefined;
  if (!Page) throw new Error(`File ${pagePath} has no default export !`);

  const pageHash = crypto.hash("sha256", pagePath, "base64url");
  const fileName = (Page.displayName ?? Page.name) + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const prerenderedPage = await renderPageToHtml(Page);
  await writeFile(prerenderPath, prerenderedPage);

  return RelativePath.fromCwd(prerenderPath);
}

/** Prerenders a markdown page to HTML using its frontmatter-defined layout. */
export async function prepareMarkdown(
  markdownPath: string,
): Promise<RelativePath> {
  const content = await readFile(markdownPath);

  const pageHash = crypto.hash("sha256", markdownPath, "base64url");
  const fileName = basename(markdownPath, ".md") + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const markdownData = parseMarkdown(content);

  const Layout = await findAndPrepareMarkdownLayout(markdownData.frontmatter);
  if (!Layout)
    throw new Error("Error while preparing layout for page " + markdownPath);

  const prerenderedPage = await renderMarkdownToHtml(markdownData, Layout);
  await writeFile(prerenderPath, prerenderedPage);

  return RelativePath.fromCwd(prerenderPath);
}

function DefaultMarkdownLayout({ children }: { children?: ComponentChildren }) {
  return html`
    <html>
      <head></head>
      <body>
        ${children}
      </body>
    </html>
  `;
}

async function findAndPrepareMarkdownLayout(
  frontmatterData: Record<string, any>,
): Promise<ComponentType<Record<string, any>> | null> {
  let layoutPath = frontmatterData["layout"];
  if (!layoutPath) {
    return DefaultMarkdownLayout;
  }

  layoutPath = path.resolve(layoutPath);
  const layoutExports = await import(layoutPath);
  if (!layoutExports || !layoutExports["default"]) return null;

  const Layout = layoutExports["default"];
  return Layout as ComponentType<Record<string, any>>;
}
