import { describe, it, expect, afterEach } from "bun:test";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { buildConfig } from "../../../src/core/config";
import { prepareImportMap } from "../../../src/core/import_map";
import { resolveAndSanitize } from "../../utils/paths";
import { TEST_CONFIG } from "../../utils/config";

describe("prepareImportMap", () => {
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

      const importMap = await prepareImportMap(config);
      expect(importMap).toEqual({});
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("should map routes to HTMLBundle objects", async () => {
    const importMap = await prepareImportMap(TEST_CONFIG);
    expect(Object.keys(importMap)).toContain("/sample");

    let expectedFullPath = resolveAndSanitize(
      "tests/fixtures",
      ".cache",
      "pages",
      "sample.html",
    );
    expect(importMap["/sample"]?.index).toBe(expectedFullPath);
  });

  it("should include all routes from pagesDir", async () => {
    const importMap = await prepareImportMap(TEST_CONFIG);
    expect(Object.keys(importMap)).toContain("/sample");
    expect(Object.keys(importMap)).toContain("/sample2");
  });

  it("should handle markdown pages", async () => {
    const importMap = await prepareImportMap(TEST_CONFIG);
    expect(Object.keys(importMap)).toContain("/markdown");
  });
});
