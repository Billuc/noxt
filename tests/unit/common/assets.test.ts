import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { getAssetPath } from "../../../src/assets";
import { copyAssets } from "../../../src/shell/assets";
import { buildConfig } from "../../../src/core/config";
import { mkdir, readlink } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { lstat } from "node:fs/promises";
import { access } from "node:fs/promises";

describe("getAssetPath", () => {
  it("should resolve asset path relative to assetsDir", () => {
    const result = getAssetPath("images/logo.png");
    const expected = path.resolve(
      process.cwd(),
      "src/assets",
      "images/logo.png",
    );
    expect(result).toBe(expected);
  });

  it("should handle leading slashes in asset path", () => {
    const result = getAssetPath("/images/logo.png");
    const expected = path.resolve(
      process.cwd(),
      "src/assets",
      "images/logo.png",
    );
    expect(result).toBe(expected);
  });

  it("should handle backslashes in asset path", () => {
    const result = getAssetPath("images\\logo.png");
    const expected = path.resolve(
      process.cwd(),
      "src/assets",
      "images/logo.png",
    );
    expect(result).toBe(expected);
  });

  it("should handle nested paths", () => {
    const result = getAssetPath("images/icons/arrow.png");
    const expected = path.resolve(
      process.cwd(),
      "src/assets",
      "images/icons/arrow.png",
    );
    expect(result).toBe(expected);
  });

  it("should handle empty path", () => {
    const result = getAssetPath("");
    const expected = path.resolve(process.cwd(), "src/assets");
    expect(result).toBe(expected);
  });
});

describe("copyAssets", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "noxt-test-"));
    const assetsDir = path.join(tempDir, "src", "assets");
    await mkdir(assetsDir, { recursive: true });

    await Bun.write(path.join(assetsDir, "test.txt"), "test content");
    await Bun.write(path.join(assetsDir, "style.css"), "body {}");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should copy assets from assetsDir to cache/assetsDir", async () => {
    const config = buildConfig({
      root: tempDir,
      assetsDir: "src/assets",
    });

    await copyAssets(config);

    const cacheAssetsDir = path.resolve(tempDir, ".cache", "src/assets");
    const testFilePath = path.join(cacheAssetsDir, "test.txt");
    const styleFilePath = path.join(cacheAssetsDir, "style.css");

    expect(await Bun.file(testFilePath).exists()).toBeTrue();
    expect(await Bun.file(styleFilePath).exists()).toBeTrue();
  });

  it("should create symlinks instead of copying files", async () => {
    const config = buildConfig({
      root: tempDir,
      assetsDir: "src/assets",
    });

    await copyAssets(config);

    const cacheAssetsDir = path.resolve(tempDir, ".cache", "src/assets");
    const testFilePath = path.join(cacheAssetsDir, "test.txt");
    const originalPath = path.join(tempDir, "src/assets", "test.txt");

    const stats = await lstat(testFilePath);
    expect(stats.isSymbolicLink()).toBeTrue();

    const linkTarget = await readlink(testFilePath);
    expect(linkTarget).toBe(originalPath);
  });

  it("should handle empty assets directory", async () => {
    const emptyAssetsDir = path.join(tempDir, "empty");
    const createdPath = await mkdir(emptyAssetsDir, { recursive: true });

    expect(createdPath).not.toBeUndefined();

    const config = buildConfig({
      root: tempDir,
      assetsDir: "empty",
    });
    await copyAssets(config);

    const cacheAssetsDir = path.resolve(tempDir, ".cache", "empty");
    await access(cacheAssetsDir);
  });

  it("should skip existing symlinks without error", async () => {
    const config = buildConfig({
      root: tempDir,
      assetsDir: "src/assets",
    });

    await copyAssets(config);
    await copyAssets(config);

    const cacheAssetsDir = path.resolve(tempDir, ".cache", "src/assets");
    const testFilePath = path.join(cacheAssetsDir, "test.txt");
    expect(await Bun.file(testFilePath).exists()).toBeTrue();
  });
});
