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
import { prepareManifest } from "./manifest";
import { rm } from "node:fs/promises";
import { CACHE_DIR, DIST } from "./paths";

await rm(CACHE_DIR, { recursive: true, force: true });
await rm(DIST, { recursive: true, force: true });
const manifest = await prepareManifest();
console.log("Generated manifest:", manifest);

await Bun.build({
  entrypoints: Object.values(manifest),
  outdir: DIST,
  target: "browser",
  splitting: true,
  minify: true,
});
