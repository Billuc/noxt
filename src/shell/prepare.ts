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
import { readFile, writeFile } from "./fs";
import type {
  ComponentChildren,
  ComponentType,
  FunctionComponent,
} from "preact";
import { html } from "htm/preact";

/** Prerenders a Preact page component to HTML and caches it. */
export async function preparePreact(
  Page: FunctionComponent<any>,
): Promise<string> {
  const pageHash = new Bun.CryptoHasher("sha256")
    .update(Page.toString())
    .digest("base64url");
  const fileName = (Page.displayName ?? Page.name) + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const prerenderedPage = await renderPageToHtml(Page);
  await writeFile(prerenderPath, prerenderedPage);

  return prerenderPath;
}

/** Prerenders a markdown page to HTML using its frontmatter-defined layout. */
export async function prepareMarkdown(markdownPath: string): Promise<string> {
  const content = await readFile(markdownPath);

  const pageHash = new Bun.CryptoHasher("sha256")
    .update(content)
    .digest("base64url");
  const fileName = basename(markdownPath, ".md") + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const markdownData = parseMarkdown(content);

  const Layout = await findAndPrepareMarkdownLayout(markdownData.frontmatter);
  if (!Layout)
    throw new Error("Error while preparing layout for page " + markdownPath);

  const prerenderedPage = await renderMarkdownToHtml(markdownData, Layout);
  await writeFile(prerenderPath, prerenderedPage);

  return prerenderPath;
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
