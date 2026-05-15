import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { mkdir, rm, readFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { buildConfig, type NoxtConfig } from "../../../src/core/config";
import { prepareIslands, type IslandData } from "../../../src/core/island";

describe("prepareIslands", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), "noxt-test-"));
    const islandsDir = path.join(tempDir, "src", "islands");
    await mkdir(islandsDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should return empty object when islands directory is empty", async () => {
    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);
    expect(islands).toEqual({});
  });

  it("should find and prepare .tsx island files", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    await Bun.write(
      path.join(islandsDir, "Counter.tsx"),
      `import { useState } from "preact/hooks";\nexport default function Counter() { return null; }`,
    );

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    expect(Object.keys(islands)).toHaveLength(1);
    const islandPath = path.resolve(islandsDir, "Counter.tsx");
    expect(Object.keys(islands)).toContain(islandPath);
  });

  it("should find and prepare .ts island files", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    await Bun.write(
      path.join(islandsDir, "counter.ts"),
      `export default function counter() { return null; }`,
    );

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    expect(Object.keys(islands)).toHaveLength(1);
  });

  it("should find and prepare .jsx island files", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    await Bun.write(
      path.join(islandsDir, "counter.jsx"),
      `export default function Counter() { return null; }`,
    );

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    expect(Object.keys(islands)).toHaveLength(1);
  });

  it("should find and prepare .js island files", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    await Bun.write(
      path.join(islandsDir, "counter.js"),
      `export default function Counter() { return null; }`,
    );

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    expect(Object.keys(islands)).toHaveLength(1);
  });

  it("should handle nested island files in subdirectories", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    const nestedDir = path.join(islandsDir, "components");
    await mkdir(nestedDir, { recursive: true });
    await Bun.write(
      path.join(nestedDir, "Button.tsx"),
      `export default function Button() { return null; }`,
    );

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    expect(Object.keys(islands)).toHaveLength(1);
    const islandPath = path.resolve(nestedDir, "Button.tsx");
    expect(Object.keys(islands)).toContain(islandPath);
  });

  it("should generate IslandData with correct properties", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    await Bun.write(
      path.join(islandsDir, "TestIsland.tsx"),
      `export default function TestIsland() { return null; }`,
    );

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    const islandPath = path.resolve(islandsDir, "TestIsland.tsx");
    const islandData = islands[islandPath]!;

    expect(islandData.fullPath).toBe(islandPath);
    expect(islandData.prerenderPath).toContain(".cache");
    expect(islandData.prerenderPath).toContain("TestIsland.tsx");
    expect(islandData.hash).toBeDefined();
    expect(typeof islandData.hash).toBe("string");
    expect(islandData.hash.length).toBeGreaterThan(0);
  });

  it("should generate unique hashes for different files", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    await Bun.write(
      path.join(islandsDir, "Counter.tsx"),
      `export default function Counter() { return null; }`,
    );
    await Bun.write(
      path.join(islandsDir, "Button.tsx"),
      `export default function Button() { return null; }`,
    );

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    const counterPath = path.resolve(islandsDir, "Counter.tsx");
    const buttonPath = path.resolve(islandsDir, "Button.tsx");
    const counterHash = islands[counterPath]!.hash;
    const buttonHash = islands[buttonPath]!.hash;

    expect(counterHash).not.toBe(buttonHash);
  });

  it("should create prerender script files", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    await Bun.write(
      path.join(islandsDir, "TestIsland.tsx"),
      `export default function TestIsland() { return null; }`,
    );

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    const islandPath = path.resolve(islandsDir, "TestIsland.tsx");
    const islandData = islands[islandPath]!;

    const prerenderContent = await Bun.file(islandData.prerenderPath).text();
    expect(prerenderContent).toContain("renderComponent");
    expect(prerenderContent).toContain("TestIsland");
    expect(prerenderContent).toContain(islandData.hash);
  });

  it("should skip non-matching files", async () => {
    const islandsDir = path.join(tempDir, "src", "islands");
    await Bun.write(
      path.join(islandsDir, "Counter.tsx"),
      `export default function Counter() { return null; }`,
    );
    await Bun.write(path.join(islandsDir, "readme.md"), "# README");
    await Bun.write(path.join(islandsDir, "styles.css"), "body {}");

    const config = buildConfig({ root: tempDir });
    const islands = await prepareIslands(config);

    expect(Object.keys(islands)).toHaveLength(1);
  });

  it("should use custom islandsDir from config", async () => {
    const customIslandsDir = path.join(tempDir, "custom", "islands");
    await mkdir(customIslandsDir, { recursive: true });
    await Bun.write(
      path.join(customIslandsDir, "Custom.tsx"),
      `export default function Custom() { return null; }`,
    );

    const config = buildConfig({
      root: tempDir,
      islandsDir: "custom/islands",
    });
    const islands = await prepareIslands(config);

    expect(Object.keys(islands)).toHaveLength(1);
    const islandPath = path.resolve(customIslandsDir, "Custom.tsx");
    expect(Object.keys(islands)).toContain(islandPath);
  });
});
