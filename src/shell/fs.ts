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
import path from "node:path";
import {
  rm,
  writeFile as write,
  readFile as read,
  glob,
  copyFile as copy,
  stat,
} from "node:fs/promises";
import type { RelativePath } from "../core/fs";
import { mkdir } from "node:fs/promises";

/** Writes a string to a file using Bun.write. */
export async function writeFile(filepath: string, content: string) {
  await mkdir(path.dirname(filepath), { recursive: true });
  await write(filepath, content);
}

/** Reads a file's contents as a string using Bun.file. */
export async function readFile(filePath: string): Promise<string> {
  return (await read(filePath)).toString("utf8");
}

/** Copy a file from `from` to `to`. */
export async function copyFile(from: string, to: string) {
  await mkdir(path.dirname(to), { recursive: true });
  await copy(from, to);
}

/** Recursively removes a folder and its contents. */
export async function removeFolder(path: string) {
  await rm(path, { recursive: true, force: true });
}

// ─── Directory Constants ─────────────────────────────────────
export const CACHE_DIR = ".cache";
export const ISLANDS_CACHE_DIR = path.join(CACHE_DIR, "_islands");
export const ASSETS_CACHE_DIR = path.join(CACHE_DIR, "assets");
export const ROUTES_CACHE_FILE = path.join(CACHE_DIR, "routes.json");
export const UTILS_CACHE_FILE = path.join(CACHE_DIR, "utils.ts");

export const ISLANDS_DIR = "islands";
export const ASSETS_DIR = "assets";
export const PAGES_DIR = "pages";

export const DIST_DIR = "dist";

// ─── Path Helpers ────────────────────────────────────────────

/** Builds a path inside .cache. */
export function cachePath(...segments: string[]): string {
  return path.join(CACHE_DIR, ...segments);
}

/** Builds a path inside .cache/assets. */
export function assetsCachePath(...segments: string[]): string {
  return path.join(ASSETS_CACHE_DIR, ...segments);
}

/** Builds a path inside dist. */
export function distPath(...segments: string[]): string {
  return path.join(DIST_DIR, ...segments);
}

/** Returns all files matching a glob pattern under a root directory. */
export async function getFilesMatchingGlob(
  globPattern: string,
  root: string,
): Promise<RelativePath[]> {
  const globFiles = glob(globPattern, { cwd: root });
  const results: RelativePath[] = [];

  for await (const file of globFiles) {
    const absolute = path.resolve(root, file);
    const stats = await stat(absolute);
    if (stats.isDirectory()) continue;
    results.push({
      fromRoot: file,
      absolute,
    });
  }

  return results;
}
