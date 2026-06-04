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
import { rm } from "node:fs/promises";

export interface RelativePath {
  fromRoot: string;
  absolute: string;
}

/** Writes a string to a file using Bun.write. */
export async function writeFile(path: string, content: string) {
  await Bun.write(path, content);
}

/** Reads a file's contents as a string using Bun.file. */
export async function readFile(filePath: string): Promise<string> {
  return await Bun.file(filePath).text();
}

/** Copy a file from `from` to `to`. */
export async function copyFile(from: string, to: string) {
  const content = await readFile(from);
  await writeFile(to, content);
}

/** Recursively removes a folder and its contents. */
export async function removeFolder(path: string) {
  await rm(path, { recursive: true, force: true });
}

/** Returns all files matching a glob pattern under a root directory. */
export async function getFilesMatchingGlob(
  globPattern: string,
  root: string,
): Promise<RelativePath[]> {
  const glob = new Bun.Glob(globPattern);
  const results: RelativePath[] = [];

  for await (const file of glob.scan(root)) {
    results.push({
      fromRoot: file,
      absolute: path.resolve(root, file),
    });
  }

  return results;
}
