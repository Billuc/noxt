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
import * as env from "./env";

export const ROOT = path.resolve(__dirname, "..");
export const INDEX = path.join(ROOT, "index.ts");
export const PAGES_DIR = path.join(ROOT, env.PAGES_DIR);
export const ASSETS_DIR = path.join(ROOT, env.ASSETS_DIR);
export const CACHE_DIR = path.join(ROOT, ".cache");
export const CACHE_PAGES_DIR = path.join(CACHE_DIR, env.PAGES_DIR);
export const CACHE_ASSETS_DIR = path.join(CACHE_DIR, env.ASSETS_DIR);
export const DIST = path.join(ROOT, "dist");

export function relativeFromRoot(fullPath: string): string {
  return path.relative(ROOT, fullPath);
}
