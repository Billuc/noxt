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
import type { MarkdownPage } from "./types";
import type { IslandEntry } from "../islands";
import { parseMarkdown } from "./parse";
import { renderMarkdownToHtml } from "./render";
import type { AssetFunction } from "../assets/types";
import type { PageFunction } from "../core/types";

export async function discoverMarkdownPages(): Promise<{
  markdownFiles: Path[];
}> {
  let pageFiles: Path[];
  try {
    pageFiles = await getFilesMatchingGlob("**/*.md", path.resolve(PAGES_DIR));
  } catch {
    console.log("No pages directory found !");
    return { markdownFiles: [] };
  }

  return { markdownFiles: pageFiles };
}

export async function prerenderMarkdownPages({
  markdownFiles,
  base,
  islands,
  asset,
  page,
}: {
  markdownFiles: Path[];
  base?: string;
  islands?: IslandEntry[];
  asset?: AssetFunction;
  page?: PageFunction;
}): Promise<{ markdownPages: MarkdownPage[] }> {
  const pages: MarkdownPage[] = [];

  for (const file of markdownFiles) {
    const url = getRouteName(file.relativeTo(PAGES_DIR));
    console.log(`Prerendering page [${url}]`);

    try {
      let prerenderedFile: Path = await prerenderMarkdown(
        file.absolute,
        base,
        islands,
        asset,
        page,
      );

      pages.push({
        url: url,
        file: prerenderedFile,
      });
    } catch (err) {
      let errorMessage = `Skipping page ${url} because of error\n`;
      if (err instanceof Error) {
        errorMessage += err.stack ?? err.message;
      } else {
        errorMessage += String(err);
      }
      console.error(errorMessage);
      continue;
    }
  }

  return { markdownPages: pages };
}

/** Prerenders a markdown page to HTML using its frontmatter-defined layout. */
async function prerenderMarkdown(
  markdownPath: string,
  base?: string,
  islands?: IslandEntry[],
  asset?: AssetFunction,
  page?: PageFunction,
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
    islands,
    asset,
    page,
  );
  await writeFile(prerenderPath, prerenderedPage);

  return Path.create(prerenderPath);
}
