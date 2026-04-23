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
import { CACHE_DIR, DIST, INDEX } from "./paths";

const importMapPlugin: Bun.BunPlugin = {
  name: "import-map-plugin",
  setup: (build) => {
    build.onLoad({ filter: /lib[\/\\]import_map\.ts$/ }, async (args) => {
      const manifest = await prepareManifest();
      console.log("Generated manifest:", manifest);

      const imports = [];
      const mapCode = [];

      for (const route in manifest) {
        const sanitizedRouteName = route.replace(/\W/g, "_");
        imports.push(
          `import ${sanitizedRouteName} from ${JSON.stringify(manifest[route])};`,
        );
        mapCode.push(`"${route}": ${sanitizedRouteName}`);
      }

      const serverFile = `
        ${imports.join("\n")}

        export async function prepareImportMap() {
          return {${mapCode.join(",\n")}};
        }
      `;

      return {
        contents: serverFile,
        loader: "js",
      };
    });
  },
};

await rm(CACHE_DIR, { recursive: true, force: true });
await rm(DIST, { recursive: true, force: true });
await Bun.build({
  entrypoints: [INDEX],
  outdir: DIST,
  target: "bun",
  plugins: [importMapPlugin],
  splitting: true,
  minify: true,
});
