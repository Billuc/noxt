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
import * as path from "node:path";
import * as crypto from "node:crypto";

import {
  getFilesMatchingGlob,
  PAGES_DIR,
  readFile,
  writeFile,
  Path,
} from "../core/fs";
import { getRouteName } from "../core/utils";
import type { MarkdownPage, MarkdownPageEntry } from "./types";
import type { IslandEntry } from "../islands";
import { parseMarkdown } from "./parse";
import { renderMarkdownToHtml } from "./render";

export async function discoverMarkdownPages(
  base?: string,
): Promise<MarkdownPageEntry[]> {
  let pageFiles: Path[];
  try {
    pageFiles = await getFilesMatchingGlob(
      "**/*.{md}",
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

export async function prerenderMarkdownPages(
  entries: MarkdownPageEntry[],
  base?: string,
  islandEntries?: IslandEntry[],
): Promise<MarkdownPage[]> {
  const pages: MarkdownPage[] = [];

  for (const entry of entries) {
    console.log(`Prerendering page [${entry.url}]`);

    try {
      let prerenderedFile: Path = await prerenderMarkdown(
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

/** Prerenders a markdown page to HTML using its frontmatter-defined layout. */
async function prerenderMarkdown(
  markdownPath: string,
  base?: string,
  islandEntries?: IslandEntry[],
): Promise<Path> {
  const content = await readFile(markdownPath);

  const pageHash = crypto.hash("sha256", markdownPath, "base64url");
  const fileName =
    path.basename(markdownPath, ".md") + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const markdownData = parseMarkdown(content);

  const prerenderedPage = await renderMarkdownToHtml(
    markdownData,
    base,
    islandEntries,
  );
  await writeFile(prerenderPath, prerenderedPage);

  return Path.create(prerenderPath);
}
