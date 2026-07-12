/**
 * Integration tests for src/shell/build.ts
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { rm, mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { RelativePath } from "../../src/core/fs";
import {
  discoverRouteFiles,
  collectAssets,
  prerenderIslands,
  bundleIslands,
  prerenderPages,
  generateRouteMap,
  generateStaticPages,
  generateUtils,
  type RouteData,
  type FileEntry,
} from "../../src/shell/build";
import { setIslandMap, type IslandEntry } from "../../src/core/registry";

const SANDBOX_DIR = path.resolve(
  import.meta.dir,
  "..",
  "..",
  "test-build-temp",
);
const ORIGINAL_CWD = process.cwd();

async function setupSandbox() {
  await rm(SANDBOX_DIR, { recursive: true, force: true });
  await mkdir(SANDBOX_DIR, { recursive: true });
}

async function cleanupSandbox() {
  process.chdir(ORIGINAL_CWD);
  await rm(SANDBOX_DIR, { recursive: true, force: true });
}

async function createPage(
  name: string,
  content: string,
  subdir: string = "",
): Promise<string> {
  const dir = path.join(SANDBOX_DIR, "pages", subdir);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, name);
  await writeFile(filePath, content);
  return filePath;
}

async function createAsset(
  name: string,
  content: string = "fake image data",
): Promise<string> {
  const dir = path.join(SANDBOX_DIR, "assets");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, name);
  await writeFile(filePath, content);
  return filePath;
}

async function createIsland(name: string, content: string): Promise<string> {
  const dir = path.join(SANDBOX_DIR, "islands");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, name);
  await writeFile(filePath, content);
  return filePath;
}

describe("discoverRouteFiles", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
  });

  afterEach(cleanupSandbox);

  it("should discover tsx pages", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );
    await createPage(
      "about.tsx",
      `import { h } from "preact";
export default function About() { return h("h1", {}, "About"); }`,
    );

    const result = await discoverRouteFiles();

    expect(result).toHaveLength(2);
    const routeNames = result.map(([name]) => name).sort();
    expect(routeNames).toEqual(["/", "/about"]);
  });

  it("should discover markdown pages", async () => {
    await createPage("contact.md", "# Contact Us");

    const result = await discoverRouteFiles();

    expect(result).toHaveLength(1);
    expect(result[0]![0]).toBe("/contact");
  });

  it("should discover ts pages (htm/preact)", async () => {
    await createPage(
      "sample.ts",
      `import { html } from "htm/preact";
export default function Sample() { return html\`<h1>Sample</h1>\`; }`,
    );

    const result = await discoverRouteFiles();

    expect(result).toHaveLength(1);
    expect(result[0]![0]).toBe("/sample");
  });

  it("should handle nested page directories", async () => {
    await createPage("post1.md", "# Post 1", "blog");
    await createPage("post2.md", "# Post 2", "blog");

    const result = await discoverRouteFiles();

    expect(result).toHaveLength(2);
    const routeNames = result.map(([name]) => name).sort();
    expect(routeNames).toEqual(["/blog/post1", "/blog/post2"]);
  });

  it("should map index files to root route", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );

    const result = await discoverRouteFiles();

    expect(result).toHaveLength(1);
    expect(result[0]![0]).toBe("/");
  });

  it("should map nested index files to directory route", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function BlogIndex() { return h("h1", {}, "Blog"); }`,
      "blog",
    );

    const result = await discoverRouteFiles();

    expect(result).toHaveLength(1);
    expect(result[0]![0]).toBe("/blog");
  });

  it("should return RelativePath objects with valid paths", async () => {
    await createPage(
      "page.tsx",
      `import { h } from "preact";
export default function Page() { return h("h1", {}, "Page"); }`,
    );

    const result = await discoverRouteFiles();

    expect(result).toHaveLength(1);
    const [, file] = result[0]!;
    expect(file).toHaveProperty("fromRoot");
    expect(file).toHaveProperty("absolute");
    expect(file.fromRoot).toContain("page.tsx");
    expect(existsSync(file.absolute)).toBe(true);
  });

  it("should return empty array when no pages exist", async () => {
    await mkdir(path.join(SANDBOX_DIR, "pages"), { recursive: true });

    const result = await discoverRouteFiles();

    expect(result).toEqual([]);
  });
});

describe("collectAssets", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
  });

  afterEach(cleanupSandbox);

  it("should discover asset files", async () => {
    await createAsset("logo.png", "png data");
    await createAsset("style.css", "body { color: red; }");

    const result = await collectAssets();

    expect(result).toHaveLength(2);
    const urls = result.map(({ url }) => url).sort();
    expect(urls).toEqual(["/assets/logo.png", "/assets/style.css"]);
  });

  it("should return RelativePath objects pointing to source", async () => {
    await createAsset("test.png");

    const result = await collectAssets();

    expect(result).toHaveLength(1);
    const { filePath: file } = result[0]!;
    expect(file).toHaveProperty("fromRoot");
    expect(file).toHaveProperty("absolute");
    expect(file.fromRoot).toContain(path.join("assets", "test.png"));
    expect(existsSync(file.absolute)).toBe(true);
  });

  it("should handle nested asset paths", async () => {
    const dir = path.join(SANDBOX_DIR, "assets", "images");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "photo.jpg"), "jpg data");

    const result = await collectAssets();

    expect(result.length).toBeGreaterThanOrEqual(1);
    const photoEntry = result.find(
      ({ url }) => url === "/assets/images/photo.jpg",
    );
    expect(photoEntry).toBeDefined();
    const { filePath: file } = photoEntry!;
    expect(file.fromRoot).toContain(path.join("assets", "images", "photo.jpg"));
    expect(existsSync(file.absolute)).toBe(true);
  });

  it("should return empty array when no assets directory exists", async () => {
    const result = await collectAssets();

    expect(result).toEqual([]);
  });

  it("should return empty array when assets directory is empty", async () => {
    await mkdir(path.join(SANDBOX_DIR, "assets"), { recursive: true });

    const result = await collectAssets();

    expect(result).toEqual([]);
  });
});

describe("prerenderIslands", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
    await mkdir(path.join(SANDBOX_DIR, ".cache"), { recursive: true });
  });

  afterEach(cleanupSandbox);

  it("should discover and prerender island components", async () => {
    await createIsland(
      "counter.tsx",
      `import { h } from "preact";
export default function Counter() { return h("div", {}, "0"); }`,
    );

    const entries = await prerenderIslands();

    expect(entries).toHaveLength(1);
    expect(entries[0]!.component.name).toBe("Counter");
    expect(entries[0]!.hash).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(entries[0]!.files.type).toBe("source");
  });

  it("should generate script file in .cache for each island", async () => {
    await createIsland(
      "widget.tsx",
      `import { h } from "preact";
export default function Widget() { return h("div", {}, "widget"); }`,
    );

    const entries = await prerenderIslands();

    expect(entries).toHaveLength(1);
    const file =
      entries[0]!.files.type === "source" ? entries[0]!.files.file : null;
    expect(file).not.toBeNull();
    expect(file!.fromRoot).toContain(".cache");
    expect(file!.fromRoot).toContain(".js");
    expect(existsSync(file!.absolute)).toBe(true);
  });

  it("should skip files with no default export", async () => {
    await createIsland(
      "noexport.ts",
      `export const something = "not default";`,
    );

    const entries = await prerenderIslands();

    expect(entries).toHaveLength(0);
  });

  it("should return empty array when no islands directory exists", async () => {
    const entries = await prerenderIslands();

    expect(entries).toEqual([]);
  });

  it("should return empty array when islands directory is empty", async () => {
    await mkdir(path.join(SANDBOX_DIR, "islands"), { recursive: true });

    const entries = await prerenderIslands();

    expect(entries).toEqual([]);
  });

  it("should prerender multiple islands", async () => {
    await createIsland(
      "counter.tsx",
      `import { h } from "preact";
export default function Counter() { return h("div", {}, "0"); }`,
    );
    await createIsland(
      "timer.tsx",
      `import { h } from "preact";
export default function Timer() { return h("div", {}, "timer"); }`,
    );

    const entries = await prerenderIslands();

    expect(entries).toHaveLength(2);
    const names = entries.map((e) => e.component.name).sort();
    expect(names).toEqual(["Counter", "Timer"]);
  });
});

describe("bundleIslands", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
    await mkdir(path.join(SANDBOX_DIR, ".cache", "_islands"), {
      recursive: true,
    });
    await mkdir(path.join(SANDBOX_DIR, "dist"), { recursive: true });
  });

  afterEach(cleanupSandbox);

  it("should bundle source-type islands into .cache/_islands", async () => {
    const islandPath = await createIsland(
      "counter.tsx",
      `import { h } from "preact";
export default function Counter() { return h("div", {}, "0"); }`,
    );

    const relFromRoot = path
      .relative(SANDBOX_DIR, islandPath)
      .replaceAll("\\", "/");
    const entry: IslandEntry = {
      component: () => null,
      hash: "testhash",
      files: {
        type: "source",
        file: new RelativePath(relFromRoot, islandPath),
      },
    };

    const result = await bundleIslands([entry]);

    expect(result).toHaveLength(1);
    expect(result[0]!.files.type).toBe("bundle");
    expect(
      existsSync(path.join(SANDBOX_DIR, ".cache", "_islands", "counter.js")),
    ).toBe(true);
  });

  it("should keep bundle-type entries unchanged", async () => {
    const bundleFile = new RelativePath(
      "dist/already-bundled.js",
      path.join(SANDBOX_DIR, "dist", "already-bundled.js"),
    );
    await writeFile(bundleFile.absolute, "console.log('bundled');");

    const entry: IslandEntry = {
      component: () => null,
      hash: "existing",
      files: {
        type: "bundle",
        files: [bundleFile],
      },
    };

    const result = await bundleIslands([entry]);

    expect(result).toHaveLength(1);
    expect(result[0]!.files.type).toBe("bundle");
    const files =
      result[0]!.files.type === "bundle" ? result[0]!.files.files : [];
    expect(files).toHaveLength(1);
    expect(files[0]!.fromRoot).toBe(bundleFile.fromRoot);
  });

  it("should handle mixed source and bundle entries", async () => {
    const islandPath = await createIsland(
      "counter.tsx",
      `import { h } from "preact";
export default function Counter() { return h("div", {}, "0"); }`,
    );

    const relFromRoot = path
      .relative(SANDBOX_DIR, islandPath)
      .replaceAll("\\", "/");
    const sourceEntry: IslandEntry = {
      component: () => null,
      hash: "sourcehash",
      files: {
        type: "source",
        file: new RelativePath(relFromRoot, islandPath),
      },
    };

    const bundleFile = new RelativePath(
      "dist/pre-bundled.js",
      path.join(SANDBOX_DIR, "dist", "pre-bundled.js"),
    );
    await writeFile(bundleFile.absolute, "console.log('pre-bundled');");

    const bundleEntry: IslandEntry = {
      component: () => null,
      hash: "bundlehash",
      files: {
        type: "bundle",
        files: [bundleFile],
      },
    };

    const result = await bundleIslands([sourceEntry, bundleEntry]);

    expect(result).toHaveLength(2);
    const types = result.map((e) => e.files.type).sort();
    expect(types).toEqual(["bundle", "bundle"]);
  });
});

describe("prerenderPages", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
    await mkdir(path.join(SANDBOX_DIR, ".cache"), { recursive: true });
  });

  afterEach(cleanupSandbox);

  it("should prerender tsx pages", async () => {
    const filePath = await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );

    const pageFile: [string, RelativePath] = [
      "/",
      RelativePath.fromCwd(filePath),
    ];
    setIslandMap([]);

    const result = await prerenderPages([pageFile], []);

    expect(result).toHaveLength(1);
    expect(result[0]!.routeName).toBe("/");
    expect(result[0]!.filePath.fromRoot).toContain(".cache");
    expect(result[0]!.filePath.fromRoot).toContain(".html");
    expect(existsSync(result[0]!.filePath.absolute)).toBe(true);
  });

  it("should prerender markdown pages", async () => {
    const filePath = await createPage("about.md", "# About Us");

    const pageFile: [string, RelativePath] = [
      "/about",
      RelativePath.fromCwd(filePath),
    ];
    setIslandMap([]);

    const result = await prerenderPages([pageFile], []);

    expect(result).toHaveLength(1);
    expect(result[0]!.routeName).toBe("/about");
    expect(result[0]!.filePath.fromRoot).toContain(".cache");
    expect(result[0]!.filePath.fromRoot).toContain(".html");
  });

  it("should prerender mixed page types", async () => {
    const tsxPath = await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );
    const mdPath = await createPage("contact.md", "# Contact");

    const pages: [string, RelativePath][] = [
      ["/", RelativePath.fromCwd(tsxPath)],
      ["/contact", RelativePath.fromCwd(mdPath)],
    ];
    setIslandMap([]);

    const result = await prerenderPages(pages, []);

    expect(result).toHaveLength(2);
    const routeNames = result.map((r) => r.routeName).sort();
    expect(routeNames).toEqual(["/", "/contact"]);
  });

  it("should prerender pages in parallel", async () => {
    const paths = [];
    for (let i = 0; i < 5; i++) {
      const p = await createPage(
        `page${i}.tsx`,
        `import { h } from "preact";
export default function Page${i}() { return h("h1", {}, "Page ${i}"); }`,
      );
      paths.push(p);
    }

    const pages: [string, RelativePath][] = paths.map((p, i) => [
      `/page${i}`,
      RelativePath.fromCwd(p),
    ]);
    setIslandMap([]);

    const result = await prerenderPages(pages, []);

    expect(result).toHaveLength(5);
    for (const route of result) {
      expect(route.filePath.fromRoot).toContain(".html");
      expect(existsSync(route.filePath.absolute)).toBe(true);
    }
  });
});

describe("generateRouteMap", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
    await mkdir(path.join(SANDBOX_DIR, ".cache"), { recursive: true });
  });

  afterEach(cleanupSandbox);

  it("should generate routes.json in .cache", async () => {
    const filePath = await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );

    const routes: RouteData[] = [
      {
        routeName: "/",
        filePath: RelativePath.fromCwd(filePath),
      },
    ];

    const result = await generateRouteMap(routes, [], []);

    expect(result.fromRoot).toContain(".cache");
    expect(result.fromRoot).toContain("routes.json");
    expect(existsSync(result.absolute)).toBe(true);
  });

  it("should include page routes in manifest", async () => {
    const filePath = await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );

    const routes: RouteData[] = [
      {
        routeName: "/",
        filePath: RelativePath.fromCwd(filePath),
      },
    ];

    const result = await generateRouteMap(routes, [], []);
    const content = JSON.parse(await readFile(result.absolute, "utf-8"));

    expect(content["/"]).toBeDefined();
    expect(content["/"]).toContain("index.tsx");
  });

  it("should include asset routes in manifest", async () => {
    const assetFile = RelativePath.fromCwd(
      path.join(SANDBOX_DIR, "assets", "test.png"),
    );
    await mkdir(path.dirname(assetFile.absolute), { recursive: true });
    await writeFile(assetFile.absolute, "png data");

    const assetFiles: FileEntry[] = [
      { url: "/assets/test.png", filePath: assetFile },
    ];

    const result = await generateRouteMap([], [], assetFiles);
    const content = JSON.parse(await readFile(result.absolute, "utf-8"));

    expect(content["/assets/test.png"]).toContain("assets");
    expect(content["/assets/test.png"]).toContain("test.png");
  });

  it("should include island files in manifest", async () => {
    const islandFile = RelativePath.fromCwd(
      path.join(SANDBOX_DIR, ".cache", "Counter.abc123.js"),
    );
    await writeFile(islandFile.absolute, "console.log('counter');");

    const entry: IslandEntry = {
      component: () => null,
      hash: "abc123",
      files: {
        type: "source",
        file: islandFile,
      },
    };

    const result = await generateRouteMap([], [entry], []);
    const content = JSON.parse(await readFile(result.absolute, "utf-8"));

    expect(Object.keys(content).length).toBe(1);
    expect(Object.values(content)[0]).toContain("Counter");
  });

  it("should combine routes, assets, and islands", async () => {
    const pagePath = await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );
    const assetFile = RelativePath.fromCwd(
      path.join(SANDBOX_DIR, "assets", "img.png"),
    );
    await mkdir(path.dirname(assetFile.absolute), { recursive: true });
    await writeFile(assetFile.absolute, "data");

    const routes: RouteData[] = [
      { routeName: "/", filePath: RelativePath.fromCwd(pagePath) },
    ];
    const assets: FileEntry[] = [
      { url: "/assets/img.png", filePath: assetFile },
    ];

    const result = await generateRouteMap(routes, [], assets);
    const content = JSON.parse(await readFile(result.absolute, "utf-8"));

    expect(Object.keys(content)).toHaveLength(2);
    expect(content["/"]).toContain("index.tsx");
    expect(content["/assets/img.png"]).toContain("img.png");
  });
});

describe("generateStaticPages", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
    await mkdir(path.join(SANDBOX_DIR, ".cache", "_islands"), {
      recursive: true,
    });
    await mkdir(path.join(SANDBOX_DIR, "dist"), { recursive: true });
  });

  afterEach(cleanupSandbox);

  it("should copy prerendered files to dist", async () => {
    const cacheFile = path.join(SANDBOX_DIR, ".cache", "TestPage.abc.html");
    await writeFile(cacheFile, "<!DOCTYPE html><html><body>Test</body></html>");

    const routes: RouteData[] = [
      {
        routeName: "/test",
        filePath: RelativePath.fromCwd(cacheFile),
      },
    ];

    const manifest = await generateStaticPages(routes, [], []);

    expect(manifest["/test"]).toBeDefined();
    expect(manifest["/test"]).toContain("dist");
    expect(manifest["/test"]).toContain("index.html");
    expect(existsSync(path.join(SANDBOX_DIR, manifest["/test"]!))).toBe(true);
  });

  it("should map root route to dist/index.html", async () => {
    const cacheFile = path.join(SANDBOX_DIR, ".cache", "Index.abc.html");
    await writeFile(cacheFile, "<!DOCTYPE html><html><body>Home</body></html>");

    const routes: RouteData[] = [
      {
        routeName: "/",
        filePath: RelativePath.fromCwd(cacheFile),
      },
    ];

    const manifest = await generateStaticPages(routes, [], []);

    expect(manifest["/"]).toBe(
      path.join("dist", "index.html").replaceAll("/", path.sep),
    );
  });

  it("should create nested directory structure in dist", async () => {
    const cacheFile = path.join(SANDBOX_DIR, ".cache", "post1.abc.html");
    await writeFile(cacheFile, "<!DOCTYPE html><html><body>Post</body></html>");

    const routes: RouteData[] = [
      {
        routeName: "/blog/post1",
        filePath: RelativePath.fromCwd(cacheFile),
      },
    ];

    const manifest = await generateStaticPages(routes, [], []);

    expect(manifest["/blog/post1"]).toContain("dist");
    expect(manifest["/blog/post1"]).toContain("blog");
    const distPath = path.join(SANDBOX_DIR, manifest["/blog/post1"]!);
    expect(existsSync(distPath)).toBe(true);
  });

  it("should include island files in manifest", async () => {
    const islandDistFile = RelativePath.fromCwd(
      path.join(SANDBOX_DIR, ".cache", "_islands", "Counter.abc.js"),
    );
    await writeFile(islandDistFile.absolute, "console.log('counter');");

    const entry: IslandEntry = {
      component: () => null,
      hash: "abc",
      files: {
        type: "bundle",
        files: [islandDistFile],
      },
    };

    const manifest = await generateStaticPages([], [entry], []);

    const keys = Object.keys(manifest);
    expect(keys.length).toBe(1);
    expect(keys[0]).toContain("Counter");
    expect(manifest[keys[0]!]).toContain(path.join("dist", "_islands"));
  });

  it("should copy asset files from assets to dist/assets", async () => {
    const sourceAssetPath = path.join(
      SANDBOX_DIR,
      "assets",
      "style.css",
    );
    await mkdir(path.join(SANDBOX_DIR, "assets"), {
      recursive: true,
    });
    await writeFile(sourceAssetPath, "body { color: red; }");

    const assetFile = RelativePath.fromCwd(sourceAssetPath);
    const assetFiles: FileEntry[] = [
      { url: "/assets/style.css", filePath: assetFile },
    ];

    const manifest = await generateStaticPages([], [], assetFiles);

    const key = "/dist/assets/style.css";
    expect(manifest[key]).toBeDefined();
    expect(manifest[key]).toContain(path.join("dist", "assets"));
    const distFilePath = path.join(SANDBOX_DIR, manifest[key]!);
    expect(existsSync(distFilePath)).toBe(true);
    const content = await readFile(distFilePath, "utf-8");
    expect(content).toBe("body { color: red; }");
  });

  it("should handle nested asset paths", async () => {
    const sourceAssetDir = path.join(SANDBOX_DIR, "assets", "images");
    const sourceAssetPath = path.join(sourceAssetDir, "photo.jpg");
    await mkdir(sourceAssetDir, { recursive: true });
    await writeFile(sourceAssetPath, "jpg data");

    const assetFile = RelativePath.fromCwd(sourceAssetPath);
    const assetFiles: FileEntry[] = [
      { url: "/assets/images/photo.jpg", filePath: assetFile },
    ];

    const manifest = await generateStaticPages([], [], assetFiles);

    const key = "/dist/assets/images/photo.jpg";
    expect(manifest[key]).toBeDefined();
    expect(manifest[key]).toContain(path.join("dist", "assets", "images"));
    const distFilePath = path.join(SANDBOX_DIR, manifest[key]!);
    expect(existsSync(distFilePath)).toBe(true);
  });

  it("should combine pages, islands, and assets in manifest", async () => {
    const cachePage = path.join(SANDBOX_DIR, ".cache", "Index.abc.html");
    await writeFile(cachePage, "<!DOCTYPE html><html><body>Home</body></html>");

    const cacheIsland = path.join(
      SANDBOX_DIR,
      ".cache",
      "_islands",
      "Button.xyz.js",
    );
    await writeFile(cacheIsland, "console.log('button');");

    const sourceAsset = path.join(SANDBOX_DIR, "assets", "img.png");
    await mkdir(path.join(SANDBOX_DIR, "assets"), {
      recursive: true,
    });
    await writeFile(sourceAsset, "png data");

    const routes: RouteData[] = [
      { routeName: "/", filePath: RelativePath.fromCwd(cachePage) },
    ];
    const islandEntry: IslandEntry = {
      component: () => null,
      hash: "xyz",
      files: {
        type: "bundle",
        files: [RelativePath.fromCwd(cacheIsland)],
      },
    };
    const assetEntry: FileEntry = {
      url: "/assets/img.png",
      filePath: RelativePath.fromCwd(sourceAsset),
    };

    const manifest = await generateStaticPages(
      routes,
      [islandEntry],
      [assetEntry],
    );

    expect(Object.keys(manifest)).toHaveLength(3);
    expect(manifest["/"]).toBeDefined();
    expect(manifest["/"]).toContain(path.join("dist", "index.html"));
    const islandManifestValue = Object.values(manifest).find(
      (v) => typeof v === "string" && v.includes("Button"),
    );
    expect(islandManifestValue).toBeDefined();
    expect(islandManifestValue).toContain(path.join("dist", "_islands"));
    expect(manifest["/dist/assets/img.png"]).toBeDefined();
    expect(manifest["/dist/assets/img.png"]).toContain(
      path.join("dist", "assets"),
    );
  });

  it("should handle multiple routes", async () => {
    const cacheFile1 = path.join(SANDBOX_DIR, ".cache", "Home.abc.html");
    await writeFile(
      cacheFile1,
      "<!DOCTYPE html><html><body>Home</body></html>",
    );
    const cacheFile2 = path.join(SANDBOX_DIR, ".cache", "About.def.html");
    await writeFile(
      cacheFile2,
      "<!DOCTYPE html><html><body>About</body></html>",
    );

    const routes: RouteData[] = [
      { routeName: "/", filePath: RelativePath.fromCwd(cacheFile1) },
      { routeName: "/about", filePath: RelativePath.fromCwd(cacheFile2) },
    ];

    const manifest = await generateStaticPages(routes, [], []);

    expect(Object.keys(manifest)).toHaveLength(2);
    expect(manifest["/"]).toContain("index.html");
    expect(manifest["/about"]).toContain("about");
  });
});

describe("generateUtils", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
    await mkdir(path.join(SANDBOX_DIR, ".cache"), { recursive: true });
  });

  afterEach(cleanupSandbox);

  it("should generate utils.ts in .cache", async () => {
    await generateUtils([], []);

    const utilsPath = path.join(SANDBOX_DIR, ".cache", "utils.ts");
    expect(existsSync(utilsPath)).toBe(true);
  });

  it("should include link function with route names", async () => {
    const pageFiles: [string, RelativePath][] = [
      ["/", RelativePath.fromCwd("pages/index.tsx")],
      ["/about", RelativePath.fromCwd("pages/about.tsx")],
    ];

    await generateUtils(pageFiles, []);

    const utilsPath = path.join(SANDBOX_DIR, ".cache", "utils.ts");
    const content = await readFile(utilsPath, "utf-8");

    expect(content).toContain("link");
    expect(content).toContain('"/"');
    expect(content).toContain('"/about"');
  });

  it("should include asset function with asset ids", async () => {
    const assetFiles: FileEntry[] = [
      {
        url: "/assets/logo.png",
        filePath: RelativePath.fromCwd("assets/logo.png"),
      },
    ];

    await generateUtils([], assetFiles);

    const utilsPath = path.join(SANDBOX_DIR, ".cache", "utils.ts");
    const content = await readFile(utilsPath, "utf-8");

    expect(content).toContain("asset");
    expect(content).toContain('"/assets/logo.png"');
  });

  it("should include both link and asset code", async () => {
    const pageFiles: [string, RelativePath][] = [
      ["/", RelativePath.fromCwd("pages/index.tsx")],
    ];
    const assetFiles: FileEntry[] = [
      {
        url: "/assets/style.css",
        filePath: RelativePath.fromCwd("assets/style.css"),
      },
    ];

    await generateUtils(pageFiles, assetFiles);

    const utilsPath = path.join(SANDBOX_DIR, ".cache", "utils.ts");
    const content = await readFile(utilsPath, "utf-8");

    expect(content).toContain("link");
    expect(content).toContain("asset");
  });

  it("should generate valid TypeScript", async () => {
    await generateUtils(
      [["/", RelativePath.fromCwd("pages/index.tsx")]],
      [
        {
          url: "/assets/img.png",
          filePath: RelativePath.fromCwd("assets/img.png"),
        },
      ],
    );

    const utilsPath = path.join(SANDBOX_DIR, ".cache", "utils.ts");
    const content = await readFile(utilsPath, "utf-8");

    expect(content).toContain("export");
    expect(content).toContain("function");
    expect(content).toContain("type RouteId");
    expect(content).toContain("type AssetId");
  });
});

describe("build", () => {
  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
  });

  afterEach(cleanupSandbox);

  async function runBuildAsSubprocess(): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    const buildScript = `
const originalLog = console.log;
console.log = () => {};
console.warn = () => {};
import { build } from "${path.resolve(ORIGINAL_CWD, "src/shell/build").replaceAll("\\", "/")}";
const result = await build();
originalLog(JSON.stringify({
  routes: result.routes.map(r => r.routeName),
  islands: result.islands.length,
  routeMapExists: !!result.routeMap,
}));
`;
    await writeFile(path.join(SANDBOX_DIR, "_build_runner.ts"), buildScript);

    const proc = Bun.spawn(["bun", "run", "_build_runner.ts"], {
      cwd: SANDBOX_DIR,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, NOXT_MODE: "dev" },
    });

    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return { exitCode, stdout, stderr };
  }

  it("should complete full build pipeline with pages only", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );
    await createPage("about.md", "# About Us");

    const { exitCode, stdout } = await runBuildAsSubprocess();

    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.routes).toHaveLength(2);
    expect(result.routes.sort()).toEqual(["/", "/about"]);
    expect(result.routeMapExists).toBe(true);
  });

  it("should complete full build pipeline with pages and assets", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );
    await createAsset("logo.png", "png data");

    const { exitCode } = await runBuildAsSubprocess();

    expect(exitCode).toBe(0);
    expect(
      existsSync(path.join(SANDBOX_DIR, "assets", "logo.png")),
    ).toBe(true);
  });

  it("should complete full build pipeline with islands", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );
    await createIsland(
      "counter.tsx",
      `import { h } from "preact";
export default function Counter() { return h("div", {}, "0"); }`,
    );

    const { exitCode, stdout } = await runBuildAsSubprocess();

    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.routes).toHaveLength(1);
    expect(result.islands).toBe(1);
  });

  it("should complete full build with all component types", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );
    await createPage("about.md", "# About");
    await createAsset("style.css", "body { margin: 0; }");
    await createIsland(
      "button.tsx",
      `import { h } from "preact";
export default function Button() { return h("button", {}, "Click"); }`,
    );

    const { exitCode, stdout } = await runBuildAsSubprocess();

    expect(exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.routes).toHaveLength(2);
    expect(result.islands).toBe(1);
    expect(result.routes.sort()).toEqual(["/", "/about"]);
    expect(
      existsSync(path.join(SANDBOX_DIR, "assets", "style.css")),
    ).toBe(true);
  });

  it("should generate valid routes.json", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );

    const { exitCode } = await runBuildAsSubprocess();

    expect(exitCode).toBe(0);
    const routesFile = path.join(SANDBOX_DIR, ".cache", "routes.json");
    expect(existsSync(routesFile)).toBe(true);
    const content = JSON.parse(await readFile(routesFile, "utf-8"));
    expect(content["/"]).toContain(".html");
  });

  it("should generate utils.ts", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );

    const { exitCode } = await runBuildAsSubprocess();

    expect(exitCode).toBe(0);
    const utilsPath = path.join(SANDBOX_DIR, ".cache", "utils.ts");
    expect(existsSync(utilsPath)).toBe(true);
    const content = await readFile(utilsPath, "utf-8");
    expect(content).toContain("link");
  });

  it("should produce deterministic output across runs", async () => {
    await createPage(
      "index.tsx",
      `import { h } from "preact";
export default function Index() { return h("h1", {}, "Home"); }`,
    );

    const result1 = await runBuildAsSubprocess();
    const files1 = await readdir(path.join(SANDBOX_DIR, ".cache")).then((f) =>
      f.filter((f) => f.endsWith(".html")).sort(),
    );

    await rm(path.join(SANDBOX_DIR, ".cache"), {
      recursive: true,
      force: true,
    });
    await rm(path.join(SANDBOX_DIR, "dist"), { recursive: true, force: true });

    const result2 = await runBuildAsSubprocess();
    const files2 = await readdir(path.join(SANDBOX_DIR, ".cache")).then((f) =>
      f.filter((f) => f.endsWith(".html")).sort(),
    );

    expect(result1.exitCode).toBe(0);
    expect(result2.exitCode).toBe(0);
    expect(files1).toEqual(files2);
  });
});
