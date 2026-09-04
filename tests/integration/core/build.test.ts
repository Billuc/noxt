/**
 * Integration tests for src/core/build.ts
 */
import { generateRouteMap, generateRouteUtils } from "../../../src/core/build";
import { Path } from "../../../src/core/fs";
import type { RouteData } from "../../../src/core/types";
import type { IslandEntry } from "../../../src/islands";
import type { AssetEntry } from "../../../src/assets/types";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { mkdir, rm, writeFile, exists, readFile } from "node:fs/promises";
import type { FunctionComponent } from "preact";

const TEST_DIR = path.join(import.meta.dir, "test-core-project");
const PAGES_DIR = path.join(TEST_DIR, "src", "pages");
const CACHE_TEST_DIR = path.join(TEST_DIR, ".cache");
const originalCwd = process.cwd();

/** Builds a named dummy component for island entries. */
function fakeIsland(name: string): FunctionComponent<any> {
  const fn = () => null;
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}

async function setupTestProject() {
  await mkdir(PAGES_DIR, { recursive: true });
  await writeFile(
    path.join(PAGES_DIR, "index.tsx"),
    "export default () => null;",
  );
  await writeFile(
    path.join(PAGES_DIR, "about.tsx"),
    "export default () => null;",
  );
  await mkdir(path.join(CACHE_TEST_DIR), { recursive: true });
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

describe("core/build", () => {
  beforeEach(async () => {
    await resetTestProject();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTestProject();
  });

  describe("generateRouteMap", () => {
    it("should write an empty manifest when no entries are provided", async () => {
      const { routeMapFile } = await generateRouteMap({});

      expect(await exists(routeMapFile.absolute)).toBe(true);
      expect(routeMapFile.absolute).toMatch(/\.cache[\\/]routes\.json$/);
      expect(await readFile(routeMapFile.absolute, "utf-8")).toBe("{}");
    });

    it("should map pages to their source files", async () => {
      const pages: RouteData[] = [
        { url: "/", file: Path.create(path.join(PAGES_DIR, "index.tsx")) },
        { url: "/about", file: Path.create(path.join(PAGES_DIR, "about.tsx")) },
      ];

      const { routeMapFile } = await generateRouteMap({ pages });
      const manifest = JSON.parse(
        await readFile(routeMapFile.absolute, "utf-8"),
      );

      expect(manifest["/"]).toBe(
        "src\\pages\\index.tsx".replaceAll("\\", path.sep),
      );
      expect(manifest["/about"]).toBe(
        "src\\pages\\about.tsx".replaceAll("\\", path.sep),
      );
    });

    it("should map assets to their source files", async () => {
      const assetsDir = path.join(TEST_DIR, "src", "assets");
      await mkdir(assetsDir, { recursive: true });
      await writeFile(path.join(assetsDir, "logo.png"), "png");

      const assets: AssetEntry[] = [
        {
          url: "/assets/logo.png",
          file: Path.create(path.join(assetsDir, "logo.png")),
        },
      ];

      const { routeMapFile } = await generateRouteMap({ assets });
      const manifest = JSON.parse(
        await readFile(routeMapFile.absolute, "utf-8"),
      );

      expect(manifest["/assets/logo.png"]).toBe(
        "src\\assets\\logo.png".replaceAll("\\", path.sep),
      );
    });

    it("should map island bundle files relative to the cache directory", async () => {
      const islands: IslandEntry[] = [
        {
          component: fakeIsland("MyIsland"),
          hash: "hash-1",
          files: [
            Path.create(
              path.join(CACHE_TEST_DIR, "_islands", "MyIsland.hash-1.js"),
            ),
          ],
        },
      ];

      const { routeMapFile } = await generateRouteMap({ islands });
      const manifest = JSON.parse(
        await readFile(routeMapFile.absolute, "utf-8"),
      );

      expect(manifest["/_islands/MyIsland.hash-1.js"]).toBe(
        ".cache\\_islands\\MyIsland.hash-1.js".replaceAll("\\", path.sep),
      );
    });

    it("should map service worker file relative to the dist directory", async () => {
      const serviceWorkerFile: Path = Path.resolve("dist/sw.js");

      const { routeMapFile } = await generateRouteMap({ serviceWorkerFile });
      const manifest = JSON.parse(
        await readFile(routeMapFile.absolute, "utf-8"),
      );

      expect(manifest["/sw.js"]).toBe("dist\\sw.js".replaceAll("\\", path.sep));
    });

    it("should apply the base prefix to every public path", async () => {
      const pages: RouteData[] = [
        { url: "/about", file: Path.create(path.join(PAGES_DIR, "about.tsx")) },
      ];
      const islands: IslandEntry[] = [
        {
          component: fakeIsland("MyIsland"),
          hash: "hash-1",
          files: [Path.create(path.join(CACHE_TEST_DIR, "MyIsland.hash-1.js"))],
        },
      ];

      const { routeMapFile } = await generateRouteMap({
        pages,
        islands,
        base: "/docs",
      });
      const manifest = JSON.parse(
        await readFile(routeMapFile.absolute, "utf-8"),
      );

      expect(manifest["/docs/about"]).toBeDefined();
      expect(manifest["/docs/MyIsland.hash-1.js"]).toBeDefined();
    });

    it("should combine pages, assets, islands and SW file in a single manifest", async () => {
      const pages: RouteData[] = [
        { url: "/", file: Path.create(path.join(PAGES_DIR, "index.tsx")) },
      ];
      const assets: AssetEntry[] = [
        {
          url: "/assets/logo.png",
          file: Path.create(path.join(TEST_DIR, "logo.png")),
        },
      ];
      const islands: IslandEntry[] = [
        {
          component: fakeIsland("MyIsland"),
          hash: "hash-1",
          files: [Path.create(path.join(CACHE_TEST_DIR, "MyIsland.hash-1.js"))],
        },
      ];
      const serviceWorkerFile: Path = Path.resolve("dist/sw.js");

      const { routeMapFile } = await generateRouteMap({
        pages,
        assets,
        islands,
        serviceWorkerFile,
      });
      const manifest = JSON.parse(
        await readFile(routeMapFile.absolute, "utf-8"),
      );

      expect(Object.keys(manifest).sort()).toEqual([
        "/",
        "/MyIsland.hash-1.js",
        "/assets/logo.png",
        "/sw.js",
      ]);
    });
  });

  describe("generateRouteUtils", () => {
    it("should write the generated utils file with the RouteId union", async () => {
      const utilsFile = path.resolve(".cache", "pages.ts");

      await generateRouteUtils({
        pageFiles: [
          Path.create(path.join(PAGES_DIR, "index.tsx")),
          Path.create(path.join(PAGES_DIR, "about.tsx")),
        ],
      });

      expect(await exists(utilsFile)).toBe(true);
      const content = await readFile(utilsFile, "utf-8");
      expect(content).toContain('type RouteId = "/" | "/about";');
    });

    it("should write the generated utils file with the RouteId equal to never when there are no pages", async () => {
      const utilsFile = path.resolve(".cache", "pages.ts");

      await generateRouteUtils({
        pageFiles: [],
      });

      expect(await exists(utilsFile)).toBe(true);
      const content = await readFile(utilsFile, "utf-8");
      expect(content).toContain("type RouteId = never;");
    });

    it("should return a page function resolving known pages", async () => {
      const { page } = await generateRouteUtils({
        pageFiles: [
          Path.create(path.join(PAGES_DIR, "index.tsx")),
          Path.create(path.join(PAGES_DIR, "about.tsx")),
        ],
      });

      expect(page("/")).toBe("/");
      expect(page("/about")).toBe("/about");
    });

    it("should throw when called with an unknown page id", async () => {
      const { page } = await generateRouteUtils({
        pageFiles: [Path.create(path.join(PAGES_DIR, "index.tsx"))],
      });

      expect(() => page("/unknown")).toThrow(
        "Unknown page with URL '/unknown'",
      );
    });

    it("should append query parameters to the generated url", async () => {
      const { page } = await generateRouteUtils({
        pageFiles: [Path.create(path.join(PAGES_DIR, "about.tsx"))],
      });

      expect(page("/about", { q: "hello world", page: 2 })).toBe(
        "/about?q=hello+world&page=2",
      );
      expect(page("/about", {})).toBe("/about");
    });

    it("should prefix pages with the base and append query params after it", async () => {
      const { page } = await generateRouteUtils({
        pageFiles: [Path.create(path.join(PAGES_DIR, "about.tsx"))],
        base: "/docs",
      });

      expect(page("/about")).toBe("/docs/about");
      expect(page("/about", { q: "x" })).toBe("/docs/about?q=x");
    });

    it("should handle an empty page list", async () => {
      const { page } = await generateRouteUtils({ pageFiles: [] });

      expect(() => page("/")).toThrow("Unknown page with URL '/'");
    });
  });
});
