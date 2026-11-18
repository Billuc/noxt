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
import type { PreactPage } from "./types";
import { getFilesMatchingGlob, PAGES_DIR, writeFile, Path } from "../core/fs";
import { importModule } from "../core/module";
import { renderPreactToHtml } from "./render";
import type { AssetFunction } from "../assets/types";
import type { PageFunction } from "../core/types";

export async function discoverPreactPages(): Promise<{
  preactFiles: Path[];
}> {
  const pageFiles = await getFilesMatchingGlob(
    "**/*.{tsx,ts,jsx,js}",
    path.resolve(PAGES_DIR),
  );
  return { preactFiles: pageFiles };
}

export async function prerenderPreactPages({
  preactFiles,
  base,
  islands,
  asset,
  page,
}: {
  preactFiles: Path[];
  base?: string;
  islands?: IslandEntry[];
  asset?: AssetFunction;
  page?: PageFunction;
}): Promise<{ preactPages: PreactPage[] }> {
  const pages: PreactPage[] = [];

  for (const file of preactFiles) {
    const url = getRouteName(file.relativeTo(PAGES_DIR));
    console.log(`Prerendering page [${url}]`);

    try {
      const prerenderedFile = await prerenderPreact(
        file.absolute,
        base,
        islands,
        asset,
        page,
      );

      if (!prerenderedFile) continue;

      pages.push({
        url: url,
        file: prerenderedFile,
      });
    } catch (err) {
      console.error(
        `Skipping page ${url} from "${file.absolute}" because of an error:`,
      );
      console.error(err);
      continue;
    }
  }

  return { preactPages: pages };
}

/** Prerenders a Preact page component to HTML and caches it. */
async function prerenderPreact(
  pagePath: string,
  base?: string,
  islands?: IslandEntry[],
  asset?: AssetFunction,
  page?: PageFunction,
): Promise<Path | null> {
  const mod = await importModule(pagePath, ["default"]);
  if (!mod) return null;

  const rawPage = mod.default;
  if (typeof rawPage !== "function") {
    console.error(
      `Page module "${pagePath}" must default-export a component function, but got ${rawPage === null ? "null" : typeof rawPage}.`,
    );
    return null;
  }
  const Page = rawPage as FunctionComponent<any>;

  const pageHash = crypto.hash("sha256", pagePath, "base64url");
  const fileName = (Page.displayName ?? Page.name) + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const prerenderedPage = await renderPreactToHtml(
    Page,
    base,
    islands,
    asset,
    page,
  );
  await writeFile(prerenderPath, prerenderedPage);

  return Path.fromAbsolute(prerenderPath);
}
