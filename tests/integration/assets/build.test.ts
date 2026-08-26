/**
 * Integration tests for src/assets/build.ts
 */
import { discoverAssets, generateAssetUtils } from "../../../src/assets/build";
import type { AssetEntry } from "../../../src/assets/types";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { mkdir, rm, writeFile, exists } from "node:fs/promises";
import { Path } from "../../../src/core/fs";

const TEST_DIR = path.join(import.meta.dir, "test-assets-project");
const ASSETS_DIR = path.join(TEST_DIR, "src", "assets");
const originalCwd = process.cwd();

/** Builds a minimal controlled asset entry for generateAssetUtilsFile. */
function createAssetEntry(url: string, filePath: string): AssetEntry {
  return { url, file: Path.create(filePath) };
}

async function setupTestProject() {
  await mkdir(path.join(ASSETS_DIR, "css"), { recursive: true });

  await writeFile(path.join(ASSETS_DIR, "logo.png"), "fake png bytes");
  await writeFile(path.join(ASSETS_DIR, "css", "styles.css"), "body {}");
  await writeFile(path.join(ASSETS_DIR, "script.js"), "console.log('hi')");
}

async function setupTestProjectWithNestedDirs() {
  await mkdir(path.join(ASSETS_DIR, "images", "icons"), { recursive: true });
  await mkdir(path.join(ASSETS_DIR, "fonts"), { recursive: true });

  await writeFile(path.join(ASSETS_DIR, "images", "hero.jpg"), "hero");
  await writeFile(path.join(ASSETS_DIR, "images", "icons", "logo.svg"), "svg");
  await writeFile(path.join(ASSETS_DIR, "fonts", "font.woff2"), "font");
}

async function setupTestProjectWithSpecialChars() {
  await mkdir(ASSETS_DIR, { recursive: true });

  await writeFile(path.join(ASSETS_DIR, "Special-File.png"), "special");
  await writeFile(path.join(ASSETS_DIR, "component_123.js"), "123");
}

async function cleanupTestProject() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

/** Safely resets the dummy project: the directory must NOT be the process
 *  cwd when deleted, or Windows returns EBUSY. */
async function resetTestProject(setup: () => Promise<void> = setupTestProject) {
  process.chdir(originalCwd);
  await cleanupTestProject();
  await setup();
  process.chdir(TEST_DIR);
}

describe("assets/build", () => {
  beforeEach(async () => {
    await resetTestProject();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTestProject();
  });

  describe("discoverAssets", () => {
    it("should discover assets from assets directory", async () => {
      const { assets } = await discoverAssets();
      expect(assets.length).toBe(3);
      expect(assets.some((a) => a.url === "/assets/logo.png")).toBe(true);
      expect(assets.some((a) => a.url === "/assets/css/styles.css")).toBe(true);
      expect(assets.some((a) => a.url === "/assets/script.js")).toBe(true);
    });

    it("should return AssetEntry objects with url and file", async () => {
      const { assets } = await discoverAssets();
      for (const entry of assets) {
        expect(entry).toHaveProperty("url");
        expect(entry).toHaveProperty("file");
        expect(entry.file).toBeInstanceOf(Path);
        expect(typeof entry.url).toBe("string");
        expect(entry.url.startsWith("/")).toBe(true);
      }
    });

    it("should return empty array when no assets folder exists", async () => {
      await rm(ASSETS_DIR, { recursive: true, force: true });
      const { assets } = await discoverAssets();
      expect(assets).toEqual([]);
    });

    it("should return empty array when assets folder is empty", async () => {
      await rm(ASSETS_DIR, { recursive: true, force: true });
      await mkdir(ASSETS_DIR, { recursive: true });
      const { assets } = await discoverAssets();
      expect(assets).toEqual([]);
    });

    it("should handle nested directories within assets folder", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const { assets } = await discoverAssets();

      expect(assets.length).toBe(3);
      expect(assets.some((a) => a.url === "/assets/images/hero.jpg")).toBe(
        true,
      );
      expect(
        assets.some((a) => a.url === "/assets/images/icons/logo.svg"),
      ).toBe(true);
      expect(assets.some((a) => a.url === "/assets/fonts/font.woff2")).toBe(
        true,
      );
    });

    it("should return Path objects with correct absolute paths", async () => {
      const { assets } = await discoverAssets();
      expect(
        assets.some(
          (a) => a.file.absolute === path.join(ASSETS_DIR, "logo.png"),
        ),
      ).toBe(true);
      expect(
        assets.some(
          (a) => a.file.absolute === path.join(ASSETS_DIR, "css", "styles.css"),
        ),
      ).toBe(true);
      expect(
        assets.some(
          (a) => a.file.absolute === path.join(ASSETS_DIR, "script.js"),
        ),
      ).toBe(true);
    });

    it("should handle assets with special characters in their names", async () => {
      await resetTestProject(setupTestProjectWithSpecialChars);
      const { assets } = await discoverAssets();

      expect(assets.length).toBe(2);
      expect(assets.some((a) => a.url === "/assets/Special-File.png")).toBe(
        true,
      );
      expect(assets.some((a) => a.url === "/assets/component_123.js")).toBe(
        true,
      );
    });
  });

  describe("generateAssetUtilsFile", () => {
    const utilsFile = () => path.resolve(TEST_DIR, ".cache", "assets.ts");

    it("should generate the exact expected file for an empty assets list", async () => {
      await generateAssetUtils({ assets: [] });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toBe(`// Auto-generated by noxt
export type AssetId = never;
`);
    });

    it("should generate the exact expected file for a single asset", async () => {
      await generateAssetUtils({
        assets: [
          createAssetEntry(
            "/assets/logo.png",
            path.join(ASSETS_DIR, "logo.png"),
          ),
        ],
      });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toBe(`// Auto-generated by noxt
export type AssetId = "/assets/logo.png";
`);
    });

    it("should generate the exact expected file for multiple assets", async () => {
      await generateAssetUtils({
        assets: [
          createAssetEntry(
            "/assets/logo.png",
            path.join(ASSETS_DIR, "logo.png"),
          ),
          createAssetEntry(
            "/assets/css/styles.css",
            path.join(ASSETS_DIR, "css", "styles.css"),
          ),
        ],
      });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toBe(`// Auto-generated by noxt
export type AssetId = "/assets/logo.png" | "/assets/css/styles.css";
`);
    });

    it("should write asset ids matching discovered assets", async () => {
      const { assets } = await discoverAssets();
      await generateAssetUtils({ assets });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toMatch(/type AssetId = .*;$/m);
      expect(content).toMatch(/"\/assets\/logo\.png"/);
      expect(content).toMatch(/"\/assets\/css\/styles\.css"/);
      expect(content).toMatch(/"\/assets\/script\.js"/);
    });

    it("should create cache directory if it doesn't exist", async () => {
      const assets = await discoverAssets();
      await generateAssetUtils(assets);

      const cacheDir = path.resolve(TEST_DIR, ".cache");
      expect(await exists(cacheDir)).toBe(true);
    });

    it("should overwrite existing utils file", async () => {
      const { assets } = await discoverAssets();

      await mkdir(path.dirname(utilsFile()), { recursive: true });
      await writeFile(utilsFile(), "to overwrite");
      await generateAssetUtils({ assets });
      const content = await Bun.file(utilsFile()).text();

      expect(content).not.toBe("to overwrite");
    });

    it("should apply the base prefix to the generated asset function", async () => {
      const { asset } = await generateAssetUtils({
        assets: [
          createAssetEntry(
            "/assets/logo.png",
            path.join(ASSETS_DIR, "logo.png"),
          ),
        ],
        base: "/base",
      });

      expect(asset("/assets/logo.png")).toBe("/base/assets/logo.png");
    });

    it("should not prefix anything when no base is provided", async () => {
      const { asset } = await generateAssetUtils({
        assets: [
          createAssetEntry(
            "/assets/css/styles.css",
            path.join(ASSETS_DIR, "css", "styles.css"),
          ),
        ],
      });

      expect(asset("/assets/css/styles.css")).toBe("/assets/css/styles.css");
    });

    it("should throw when called with an unknown asset id", async () => {
      const { asset } = await generateAssetUtils({
        assets: [
          createAssetEntry(
            "/assets/logo.png",
            path.join(ASSETS_DIR, "logo.png"),
          ),
          createAssetEntry(
            "/assets/css/styles.css",
            path.join(ASSETS_DIR, "css", "styles.css"),
          ),
        ],
        base: "/base",
      });

      expect(() => asset("/assets/unknown.png")).toThrow(
        "Unknown asset with ID '/assets/unknown.png'",
      );
    });
  });
});
