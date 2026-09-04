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
import fs from "node:fs/promises";

export class Path {
  constructor(public absolute: string) {}

  static create(absolute: string): Path {
    return new Path(absolute);
  }

  static resolve(relative: string): Path {
    return new Path(path.resolve(relative));
  }

  relativeToCwd(): string {
    return path.relative(process.cwd(), this.absolute);
  }

  relativeTo(base: string): string {
    return path.relative(path.resolve(base), this.absolute);
  }
}

// ─── Util Functions ────────────────────────────────────────────

/** Writes a string to a file. */
export async function writeFile(filepath: string, content: string) {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, content);
}

/** Reads a file's contents as a string. */
export async function readFile(filePath: string): Promise<string> {
  return (await fs.readFile(filePath)).toString("utf8");
}

/** Copy a file from `from` to `to`. */
export async function copyFile(from: string, to: string) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

/** Recursively removes a folder and its contents. */
export async function removeFolder(path: string) {
  await fs.rm(path, { recursive: true, force: true });
}

// ─── Directory Constants ─────────────────────────────────────
export const CACHE_DIR = ".cache";
export const ISLANDS_CACHE_DIR = path.join(CACHE_DIR, "_islands");
export const ROUTES_CACHE_FILE = path.join(CACHE_DIR, "routes.json");
export const PAGES_CACHE_FILE = path.join(CACHE_DIR, "pages.ts");
export const API_CACHE_FILE = path.join(CACHE_DIR, "api.ts");
export const ASSETS_CACHE_FILE = path.join(CACHE_DIR, "assets.ts");

export const ISLANDS_DIR = path.join("src", "islands");
export const ASSETS_DIR = path.join("src", "assets");
export const PAGES_DIR = path.join("src", "pages");
export const API_DIR = path.join("src", "api");

export const DIST_DIR = "dist";

// ─── Path Helpers ────────────────────────────────────────────

/** Builds a path inside .cache. */
export function cachePath(...segments: string[]): string {
  return path.join(CACHE_DIR, ...segments);
}

/** Builds a path inside dist. */
export function distPath(...segments: string[]): string {
  return path.join(DIST_DIR, ...segments);
}

/** Returns all files matching a glob pattern under a root directory. */
export async function getFilesMatchingGlob(
  globPattern: string,
  root: string,
): Promise<Path[]> {
  const globFiles = fs.glob(globPattern, { cwd: root });
  const results: Path[] = [];

  for await (const file of globFiles) {
    const absolute = path.resolve(root, file);
    const stats = await fs.stat(absolute);
    if (stats.isDirectory()) continue;
    results.push(Path.create(absolute));
  }

  return results;
}
