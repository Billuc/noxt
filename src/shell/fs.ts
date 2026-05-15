import type { PathLike } from "bun";
import path from "node:path";
import { rm } from "node:fs/promises";
import { symlink } from "node:fs/promises";
import { mkdir } from "node:fs/promises";

interface RelativePath {
  fromRoot: string;
  absolute: string;
}

export async function writeFile(path: PathLike, content: string) {
  await Bun.write(path, content);
}

export async function removeFolder(path: string) {
  await rm(path, { recursive: true, force: true });
}

export async function linkDir(source: string, target: string) {
  await mkdir(target, { recursive: true });
  await symlink(source, target, "dir");
}

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
