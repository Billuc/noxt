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
import {
  ASSETS_CACHE_FILE,
  ASSETS_DIR,
  getFilesMatchingGlob,
  writeFile,
} from "../core/fs";
import { toPublicPath } from "../core/utils";
import { Path } from "../core/fs";
import type { AssetEntry, AssetFunction } from "./types";
import { generateAssetUtilsCode } from "./code_generation";

export async function discoverAssets(): Promise<{ assets: AssetEntry[] }> {
  let assetFiles: Path[];
  try {
    assetFiles = await getFilesMatchingGlob("**/*", path.resolve(ASSETS_DIR));
  } catch {
    console.log("No assets folder found");
    return { assets: [] };
  }

  const assets = assetFiles.map((file) => ({
    url: toPublicPath(file.relativeTo("src")),
    file: file,
  }));
  return { assets };
}

export async function generateAssetUtils({
  assets,
  base,
}: {
  assets: AssetEntry[];
  base?: string;
}): Promise<{ asset: AssetFunction }> {
  const assetIds = assets.map((a) => a.url);

  let code = generateAssetUtilsCode(assetIds);

  const utilsFile = path.resolve(ASSETS_CACHE_FILE);
  await writeFile(utilsFile, code);
  console.log("Generated assets utils at .cache/assets.ts");

  const asset = prepareAssetFunction(assetIds, base);
  return { asset };
}

function prepareAssetFunction(
  assetIds: string[],
  base?: string,
): AssetFunction {
  function asset<AssetId extends string>(id: AssetId): string {
    if (!assetIds.includes(id)) {
      throw new Error(`Unknown asset with ID '${id}'`);
    }
    return (base ?? "") + id;
  }

  return asset;
}
