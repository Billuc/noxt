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

/**
 * Converts a file path from pages directory to a route name.
 * Removes file extension and handles 'index' specially.
 *
 * @param pathFromPages - Relative path from the pages directory
 * @returns Route name (e.g., "about.md" -> "/about", "index.md" -> "/")
 */
export function getRouteName(pathFromPages: string): string {
  const extension = path.extname(pathFromPages);
  const basename = pathFromPages
    .replaceAll("\\", "/")
    .slice(0, -extension.length);

  const noIndexBasename = basename.endsWith("index")
    ? basename.slice(0, -5)
    : basename;
  const trimmedBasename = noIndexBasename.endsWith("/")
    ? noIndexBasename.slice(0, -1)
    : noIndexBasename;

  return trimmedBasename === "" ? "/" : trimmedBasename;
}

export function routeToHtmlPath(routeName: string): string {
  const relative = routeName.replace(/^\//, "");
  if (relative === "") return "index.html";
  return path.join(relative, "index.html");
}

export function toPublicPath(relativePath: string, base: string = ""): string {
  const trimmed = trim(relativePath.replaceAll("\\", "/"), "/");
  const trimmedBase = trim(base, "/");
  return "/" + (trimmedBase ? trimmedBase + "/" : "") + trimmed;
}

export function sanitizePrerendered(content: string) {
  if (content.startsWith("<html")) {
    return "<!DOCTYPE html>" + content;
  }
  return unescape(content);
}

function trim(str: string, character: string): string {
  if (character.length === 0) return str;

  const ch = character[0];
  let start = 0;
  let end = str.length;

  while (start < end && str[start] === ch) ++start;
  while (end > start && str[end - 1] === ch) --end;

  return start > 0 || end < str.length ? str.substring(start, end) : str;
}

function unescape(content: string): string {
  return content
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&quot;", '"');
}
