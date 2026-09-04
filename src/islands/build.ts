import * as path from "node:path";
import * as esbuild from "esbuild";
import * as crypto from "node:crypto";
import type { FunctionComponent } from "preact";

import type { IslandEntry, PrerenderedIslandEntry } from "./types";
import {
  getFilesMatchingGlob,
  ISLANDS_CACHE_DIR,
  ISLANDS_DIR,
  writeFile,
  Path,
} from "../core/fs";
import { isDev } from "../core/env";
import { generateScriptForIsland } from "./code_generation";
import { standardizePath } from "./utils";

export async function discoverIslands(): Promise<{ islandFiles: Path[] }> {
  let islandFiles: Path[];
  try {
    islandFiles = await getFilesMatchingGlob(
      "**/*.{tsx,ts,jsx,js}",
      path.resolve(ISLANDS_DIR),
    );
  } catch {
    console.log("No islands directory found !");
    return { islandFiles: [] };
  }

  return { islandFiles };
}

export async function prerenderIslands({
  islandFiles,
  base,
}: {
  islandFiles: Path[];
  base?: string;
}): Promise<{ islands: IslandEntry[] }> {
  const prerendered: PrerenderedIslandEntry[] = [];

  for (const file of islandFiles) {
    const mod = await import(file.absolute);
    const Island = mod.default as FunctionComponent<any>; // TODO: better assertion

    if (!Island) {
      console.warn(
        `Island file ${file.relativeToCwd()} has no default export, skipping`,
      );
      continue;
    }

    const hash = crypto.hash("sha256", file.absolute, "base64url");
    const fileName = (Island.displayName ?? Island.name) + "." + hash + ".js";
    const scriptPath = path.resolve(".cache", fileName);

    const scriptContent = generateScriptForIsland(hash, file.absolute, base);
    await writeFile(scriptPath, scriptContent);

    prerendered.push({
      component: Island,
      hash,
      sourceFile: file,
      renderScriptFile: Path.fromAbsolute(scriptPath),
    });
    console.log(`Prerendered island [${Island.displayName ?? Island.name}]`);
  }

  console.log(`Bundling islands`);
  const islands = await bundleIslands(prerendered);
  return { islands };
}

async function bundleIslands(
  islands: PrerenderedIslandEntry[],
): Promise<IslandEntry[]> {
  const devMode = isDev();
  const entrypoints = islands.map((ie) => {
    return ie.renderScriptFile.absolute;
  });

  const result = await esbuild.build({
    entryPoints: entrypoints,
    absWorkingDir: process.cwd(),
    outdir: path.resolve(ISLANDS_CACHE_DIR),
    minify: !devMode,
    sourcemap: devMode,
    splitting: false, // !devMode, // TODO : splitting
    jsxImportSource: "preact",
    jsx: "automatic",
    jsxDev: devMode,
    jsxFactory: "h",
    bundle: true,
    format: "esm",
    logLevel: "info",
    metafile: true,
  });

  const entriesMap: Record<string, IslandEntry> = {};

  islands.forEach((ie) => {
    entriesMap[standardizePath(ie.sourceFile.absolute)] = {
      component: ie.component,
      hash: ie.hash,
      files: [],
    };
  });

  for (const output in result.metafile.outputs) {
    const inputs = result.metafile.outputs[output]?.inputs ?? {};
    for (const input in inputs) {
      const entry =
        entriesMap[standardizePath(path.resolve(process.cwd(), input))];
      if (!entry) continue;
      entry.files.push(Path.fromRelative(output));
    }
  }

  return Object.values(entriesMap);
}
