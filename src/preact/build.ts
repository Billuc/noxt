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
import { getRouteName } from "../core/utils";
import path from "node:path";
import * as crypto from "node:crypto";
import type { FunctionComponent } from "preact";
import type { IslandEntry } from "../islands";
import type { PreactPage, PreactPageEntry } from "./types";
import { getFilesMatchingGlob, PAGES_DIR, writeFile, Path } from "../core/fs";
import { renderPreactToHtml } from "./render";

export async function discoverPreactPages(
  base?: string,
): Promise<PreactPageEntry[]> {
  let pageFiles: Path[];
  try {
    pageFiles = await getFilesMatchingGlob(
      "**/*.{tsx,ts,jsx,js}",
      path.resolve(PAGES_DIR),
    );
  } catch {
    console.log("No pages directory found !");
    return [];
  }

  return pageFiles.map((file) => ({
    url: getRouteName(file.relativeTo(PAGES_DIR), base),
    file,
  }));
}

export async function prerenderPreactPages(
  entries: PreactPageEntry[],
  base?: string,
  islandEntries?: IslandEntry[],
): Promise<PreactPage[]> {
  const pages: PreactPage[] = [];

  for (const entry of entries) {
    console.log(`Prerendering page [${entry.url}]`);

    try {
      let prerenderedFile: Path = await prerenderPreact(
        entry.file.absolute,
        base,
        islandEntries,
      );

      pages.push({
        url: entry.url,
        file: prerenderedFile,
      });
    } catch (err) {
      console.error(String(err) + " Skipping");
      continue;
    }
  }

  return pages;
}

/** Prerenders a Preact page component to HTML and caches it. */
async function prerenderPreact(
  pagePath: string,
  base?: string,
  islandEntries?: IslandEntry[],
): Promise<Path> {
  const mod = await import(pagePath);
  const Page = mod.default as FunctionComponent<any> | undefined;
  if (!Page) throw new Error(`File ${pagePath} has no default export !`);

  const pageHash = crypto.hash("sha256", pagePath, "base64url");
  const fileName = (Page.displayName ?? Page.name) + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const prerenderedPage = await renderPreactToHtml(Page, base, islandEntries);
  await writeFile(prerenderPath, prerenderedPage);

  return Path.create(prerenderPath);
}
