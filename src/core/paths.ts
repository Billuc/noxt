import type { NoxtConfig } from "./config";
import path from "node:path";

export function cacheAssetsDir(config: NoxtConfig): string {
  return path.resolve(config.root, ".cache", config.assetsDir);
}
export function assetsDir(config: NoxtConfig): string {
  return path.resolve(config.root, config.assetsDir);
}
export function cachePagesDir(config: NoxtConfig): string {
  return path.resolve(config.root, ".cache", config.pagesDir);
}
export function islandsDir(config: NoxtConfig): string {
  return path.resolve(config.root, config.islandsDir);
}
export function cacheIslandsDir(config: NoxtConfig): string {
  return path.resolve(config.root, ".cache", config.islandsDir);
}

export function getPageFilePath(
  config: NoxtConfig,
  pathFromPages: string,
): string {
  const pagesDir = path.resolve(config.root, config.pagesDir);
  return path.join(pagesDir, pathFromPages);
}

export function getIslandFilePath(
  config: NoxtConfig,
  pathFromIslands: string,
): string {
  const islandsDir = path.resolve(config.root, config.islandsDir);
  return path.join(islandsDir, pathFromIslands);
}
