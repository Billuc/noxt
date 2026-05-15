import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { buildConfig } from "../../../src/core/config";
import { prepareManifest } from "../../../src/shell/manifest";
import { TEST_CONFIG } from "../../utils/config";

describe("prepareManifest", () => {
  afterEach(async () => {
    await rm(path.resolve("tests/fixtures", ".cache"), {
      recursive: true,
      force: true,
    });
  });

  it("should return empty object when pagesDir is empty", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "noxt-test-"));
    const pagesDir = path.join(tempDir, "src", "pages");
    const assetsDir = path.join(tempDir, "src", "assets");
    const islandsDir = path.join(tempDir, "src", "islands");
    await mkdir(pagesDir, { recursive: true });
    await mkdir(assetsDir, { recursive: true });
    await mkdir(islandsDir, { recursive: true });

    try {
      const config = buildConfig({ root: tempDir });

      const manifest = await prepareManifest(config);
      expect(manifest).toEqual({});
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("should prerender .tsx pages to HTML", async () => {
    const manifest = await prepareManifest(TEST_CONFIG);

    expect(Object.keys(manifest)).toContain("/sample");
    expect(manifest["/sample"]).toBe(
      path.resolve("tests/fixtures", ".cache", "pages", "sample.html"),
    );
  });

  it("should prerender .ts page to HTML", async () => {
    const manifest = await prepareManifest(TEST_CONFIG);

    expect(Object.keys(manifest)).toContain("/sample2");
    expect(manifest["/sample2"]).toBe(
      path.resolve("tests/fixtures", ".cache", "pages", "sample2.html"),
    );
  });

  it("should prerender markdown page to HTML", async () => {
    const manifest = await prepareManifest(TEST_CONFIG);

    expect(Object.keys(manifest)).toContain("/markdown");
    expect(manifest["/markdown"]).toBe(
      path.resolve("tests/fixtures", ".cache", "pages", "markdown.html"),
    );
  });

  it("should handle index.tsx as root route", async () => {
    const manifest = await prepareManifest(TEST_CONFIG);

    expect(Object.keys(manifest)).toContain("/");
    expect(manifest["/"]).toBe(
      path.resolve("tests/fixtures", ".cache", "pages", "index.html"),
    );
  });

  it("should handle nested pages in subdirectories", async () => {
    const manifest = await prepareManifest(TEST_CONFIG);

    expect(Object.keys(manifest)).toContain("/nested/post1");
    expect(manifest["/nested/post1"]).toBe(
      path.resolve("tests/fixtures", ".cache", "pages", "nested/post1.html"),
    );
  });

  // it("should skip pages without default export", async () => {
  //   const pagesDir = path.join(tempDir, "src", "pages");
  //   await Bun.write(
  //     path.join(pagesDir, "no-export.tsx"),
  //     `import { html } from "htm/preact";\nexport function Component() { return html\`<h1>No Export</h1>\`; }`,
  //   );

  //   const config = buildConfig({ root: tempDir });
  //   const manifest = await prepareManifest(config);

  //   expect(Object.keys(manifest)).toHaveLength(0);
  // });

  // it("should copy assets to cache directory", async () => {
  //   const assetsDir = path.join(tempDir, "src", "assets");
  //   await Bun.write(path.join(assetsDir, "test.png"), "fake image data");

  //   const pagesDir = path.join(tempDir, "src", "pages");
  //   await Bun.write(
  //     path.join(pagesDir, "index.tsx"),
  //     `import { html } from "htm/preact";\nexport default function Home() { return html\`<h1>Home</h1>\`; }`,
  //   );

  //   const config = buildConfig({ root: tempDir });
  //   await prepareManifest(config);

  //   const cacheAssetsDir = path.resolve(tempDir, ".cache", "src", "assets");
  //   const cachedAsset = path.join(cacheAssetsDir, "test.png");
  //   expect(await Bun.file(cachedAsset).exists()).toBeTrue();
  // });

  // it("should prepare islands for client-side hydration", async () => {
  //   const islandsDir = path.join(tempDir, "src", "islands");
  //   await Bun.write(
  //     path.join(islandsDir, "Counter.tsx"),
  //     `import { useState } from "preact/hooks";\nexport default function Counter() { return null; }`,
  //   );

  //   const pagesDir = path.join(tempDir, "src", "pages");
  //   await Bun.write(
  //     path.join(pagesDir, "index.tsx"),
  //     `import { html } from "htm/preact";\nexport default function Home() { return html\`<h1>Home</h1>\`; }`,
  //   );

  //   const config = buildConfig({ root: tempDir });
  //   await prepareManifest(config);

  //   const cacheIslandsDir = path.resolve(tempDir, ".cache", "src", "islands");
  //   const islandScript = path.join(cacheIslandsDir, "Counter.tsx");
  //   expect(await Bun.file(islandScript).exists()).toBeTrue();
  // });

  it("should handle markdown with frontmatter layout", async () => {
    const manifest = await prepareManifest(TEST_CONFIG);

    expect(Object.keys(manifest)).toContain("/markdown_with_layout");

    const html = await Bun.file(manifest["/markdown_with_layout"]!).text();

    expect(html).toMatch(/<body>\s*THIS IS A TEST\s*<main>/);
  });
});
