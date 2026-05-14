import path from "node:path";

export function resolveAndSanitize(...paths: string[]): string {
  let fullPath = path.resolve(...paths);
  const partition = fullPath.charAt(0);
  if (partition.match(/^[a-z]$/)) {
    return partition.toUpperCase() + fullPath.slice(1);
  }
  return fullPath;
}
