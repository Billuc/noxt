import { staticPrerender } from "../../src/shell/static";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { rm, mkdir, writeFile, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const SANDBOX_DIR = path.resolve(import.meta.dir, "..", "..", "test-static-temp");
const PAGES_DIR = path.join(SANDBOX_DIR, "pages");
const DIST_DIR = path.join(SANDBOX_DIR, "dist");
const CACHE_DIR = path.join(SANDBOX_DIR, ".cache");
const EXPORT_DIR = path.join(SANDBOX_DIR, ".export");

async function setupSandbox() {
  await rm(SANDBOX_DIR, { recursive: true, force: true });
  await mkdir(PAGES_DIR, { recursive: true });

  await writeFile(
    path.join(PAGES_DIR, "index.tsx"),
    `import { h } from "preact";
export default function HomePage() {
  return h("h1", {}, "Home");
}`,
  );

  await writeFile(
    path.join(PAGES_DIR, "about.tsx"),
    `import { h } from "preact";
export default function AboutPage() {
  return h("h1", {}, "About");
}`,
  );
}

async function cleanupSandbox() {
  await rm(SANDBOX_DIR, { recursive: true, force: true });
}

describe("staticPrerender", () => {
  const originalCwd = process.cwd();

  beforeEach(async () => {
    await setupSandbox();
    process.chdir(SANDBOX_DIR);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupSandbox();
  });

  it("should generate dist directory with built files", async () => {
    await staticPrerender();

    expect(existsSync(DIST_DIR)).toBe(true);
    const distFiles = await readdir(DIST_DIR);
    expect(distFiles.length).toBeGreaterThan(0);
  });

  it("should create .cache directory with prerendered HTML files", async () => {
    await staticPrerender();

    expect(existsSync(CACHE_DIR)).toBe(true);
    const cacheFiles = await readdir(CACHE_DIR);
    const htmlFiles = cacheFiles.filter(f => f.endsWith(".html"));
    expect(htmlFiles.length).toBe(2);
  });

  it("should create .cache manifest.json", async () => {
    await staticPrerender();

    const manifestPath = path.join(CACHE_DIR, "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
    expect(manifest.length).toBe(2);
    const routes = manifest.map((r: any) => r.routeName).sort();
    expect(routes).toEqual(["/", "/about"]);
  });

  it("should remove staging directory after build", async () => {
    await staticPrerender();

    expect(existsSync(EXPORT_DIR)).toBe(false);
  });

  it("should output files in dist directory", async () => {
    await staticPrerender();

    const distFiles = await readdir(DIST_DIR);
    expect(distFiles.length).toBeGreaterThan(0);
  });
});
