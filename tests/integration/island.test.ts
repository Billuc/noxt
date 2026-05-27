/**
 * Integration tests for src/shell/island.ts
 */
import { prepareIsland } from "../../src/shell/island";
import {
  defineIsland,
  generateScriptForIsland,
  getHash,
} from "../../src/core/island";
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import path from "node:path";
import { rm, mkdir, readdir } from "node:fs/promises";

const CACHE_DIR = path.resolve(".cache");

// Test component type
interface TestProps {
  name: string;
  count?: number;
}

// Simple test component
const TestComponent = ({ name, count = 0 }: TestProps) =>
  h("div", { class: "test-island" }, `Hello ${name}, count: ${count}`);

async function setupCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function cleanupCacheDir() {
  await rm(CACHE_DIR, { recursive: true, force: true });
}

// Helper to decode HTML entities in data-props
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

describe("prepareIsland", () => {
  beforeEach(async () => {
    await setupCacheDir();
  });

  afterEach(async () => {
    await cleanupCacheDir();
  });

  it("should generate a prerendered script file in .cache", async () => {
    const island = defineIsland(TestComponent, "./test/component");
    await prepareIsland(island);

    // Check that cache directory has the generated file
    const files = await readdir(CACHE_DIR);
    expect(files.length).toBeGreaterThan(0);
    expect(files).toContain(`${getHash(island)}.js`);
  });

  it("should return a functional component that renders div with data-island attribute", async () => {
    const island = defineIsland(TestComponent, "./test/component");
    const IslandComponent = await prepareIsland(island);

    const props: TestProps = { name: "World" };
    const html = renderToString(h(IslandComponent, props));

    expect(html).toContain(`<div data-island="${getHash(island)}" data-props=`);
  });

  it("should include props in data-props attribute as JSON", async () => {
    const island = defineIsland(TestComponent, "./test/component");
    const IslandComponent = await prepareIsland(island);

    const props: TestProps = { name: "Test", count: 42 };
    const html = renderToString(h(IslandComponent, props));

    expect(html).toContain("data-props=");
    const propsMatch = html.match(/data-props="([^"]*)"/);
    expect(propsMatch).not.toBeNull();

    const decodedProps = decodeHtmlEntities(propsMatch![1]!);
    const parsedProps = JSON.parse(decodedProps);
    expect(parsedProps.name).toBe("Test");
    expect(parsedProps.count).toBe(42);
  });

  it("should include script tag with src pointing to cache file", async () => {
    const island = defineIsland(TestComponent, "./test/component");
    const IslandComponent = await prepareIsland(island);

    const props: TestProps = { name: "ScriptTest" };
    const html = renderToString(h(IslandComponent, props));

    expect(html).toContain(
      `<script src="${path.join(CACHE_DIR, getHash(island) + ".js")}"`,
    );
  });

  it("should generate consistent hash for the same island", async () => {
    const island = defineIsland(TestComponent, "./test/same-component");

    const IslandComponent1 = await prepareIsland(island);
    const html1 = renderToString(h(IslandComponent1, { name: "Test1" }));
    const hashMatch1 = html1.match(/data-island="([^"]*)"/);

    // Clean up cache to force regeneration
    await cleanupCacheDir();
    await setupCacheDir();

    const IslandComponent2 = await prepareIsland(island);
    const html2 = renderToString(h(IslandComponent2, { name: "Test2" }));
    const hashMatch2 = html2.match(/data-island="([^"]*)"/);

    expect(hashMatch1).not.toBeNull();
    expect(hashMatch2).not.toBeNull();
    expect(hashMatch1![1]).toBe(hashMatch2![1]);
  });

  it("should generate different hashes for different islands", async () => {
    // Create separate component functions to ensure different references
    const ComponentA = ({ name }: TestProps) =>
      h("div", {}, `Component A: ${name}`);
    const ComponentB = ({ name }: TestProps) =>
      h("div", {}, `Component B: ${name}`);

    const island1 = defineIsland(ComponentA, "./test/component-a");
    const island2 = defineIsland(ComponentB, "./test/component-b");

    const IslandComponent1 = await prepareIsland(island1);
    const html1 = renderToString(h(IslandComponent1, { name: "A" }));
    const hashMatch1 = html1.match(/data-island="([^"]*)"/);

    const IslandComponent2 = await prepareIsland(island2);
    const html2 = renderToString(h(IslandComponent2, { name: "B" }));
    const hashMatch2 = html2.match(/data-island="([^"]*)"/);

    expect(hashMatch1).not.toBeNull();
    expect(hashMatch2).not.toBeNull();
    expect(hashMatch1![1]).not.toBe(hashMatch2![1]);
  });

  it("should write valid script content to cache file", async () => {
    const island = defineIsland(TestComponent, "./test/valid-script");
    await prepareIsland(island);

    const cacheFiles = await readdir(CACHE_DIR);
    const scriptFile = cacheFiles.find((f) => f == `${getHash(island)}.js`);
    expect(scriptFile).toBeDefined();

    const scriptContent = await Bun.file(
      path.join(CACHE_DIR, scriptFile!),
    ).text();

    expect(scriptContent).toBe(generateScriptForIsland(island));
  });

  it("should handle empty props object", async () => {
    const island = defineIsland(TestComponent, "./test/empty-props");
    const IslandComponent = await prepareIsland(island);

    // @ts-expect-error - intentionally passing no props
    const html = renderToString(h(IslandComponent, {}));

    expect(html).toContain('data-props="{}"');
  });

  it("should use island displayName in console log", async () => {
    const NamedComponent = ({ name }: TestProps) =>
      h("div", {}, `Hello ${name}`);
    NamedComponent.displayName = "MyCustomIsland";

    const island = defineIsland(NamedComponent, "./test/named");

    // Capture console.log output
    const consoleLogMock = mock((_) => {});
    const originalLog = console.log;
    console.log = consoleLogMock;

    await prepareIsland(island);

    expect(consoleLogMock.mock.calls.length).toBeGreaterThan(0);
    const logMessage = consoleLogMock.mock.calls[0]![0];
    expect(logMessage).toContain("MyCustomIsland");

    console.log = originalLog;
  });

  it("should use island name as fallback when displayName is not set", async () => {
    const island = defineIsland(TestComponent, "./test/fallback");

    const consoleLogMock = mock((_) => {});
    const originalLog = console.log;
    console.log = consoleLogMock;

    await prepareIsland(island);

    expect(consoleLogMock.mock.calls.length).toBeGreaterThan(0);
    const logMessage = consoleLogMock.mock.calls[0]![0];
    expect(logMessage).toContain("TestComponent");

    console.log = originalLog;
  });
});
