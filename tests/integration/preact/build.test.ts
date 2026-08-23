/**
 * Integration tests for src/preact/build.ts
 */
import {
  discoverPreactPages,
  prerenderPreactPages,
} from "../../../src/preact/build";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import {
  mkdir,
  rm,
  writeFile,
  exists,
  readdir,
  readFile,
} from "node:fs/promises";
import { Path } from "../../../src/core/fs";

const TEST_DIR = path.join(import.meta.dir, "test-preact-project");
const PAGES_DIR = path.join(TEST_DIR, "src", "pages");
const originalCwd = process.cwd();

async function setupTestProject() {
  await mkdir(PAGES_DIR, { recursive: true });

  await writeFile(
    path.join(PAGES_DIR, "index.tsx"),
    `import { h } from "preact";
export default function Home() {
  return <div>Home page</div>;
}
`,
  );

  await writeFile(
    path.join(PAGES_DIR, "about.ts"),
    `import { h } from "preact";

export default function About() {
  return h("h1", null, "About");
}
`,
  );

  await writeFile(
    path.join(PAGES_DIR, "NoDefault.tsx"),
    `import { h } from "preact";

export function NotDefault() {
  return h("div", null, "No default export");
}
`,
  );
}

async function setupTestProjectWithExtensions() {
  await mkdir(PAGES_DIR, { recursive: true });

  await writeFile(
    path.join(PAGES_DIR, "ComponentA.tsx"),
    `import { h } from "preact";
export default function ComponentA() { return <div>TSX</div>; }`,
  );
  await writeFile(
    path.join(PAGES_DIR, "ComponentB.ts"),
    `import { h } from "preact";
export default function ComponentB() { return h("div", null, "TS"); }`,
  );
  await writeFile(
    path.join(PAGES_DIR, "ComponentC.jsx"),
    `import { h } from "preact";
export default function ComponentC() { return <div>JSX</div>; }`,
  );
  await writeFile(
    path.join(PAGES_DIR, "ComponentD.js"),
    `import { h } from "preact";
export default function ComponentD() { return h("div", null, "JS"); }`,
  );
  await writeFile(
    path.join(PAGES_DIR, "ComponentE.foo"),
    `import { h } from "preact";
export default function ComponentE() { return h("div", null, "FOO"); }`,
  );
  await writeFile(path.join(PAGES_DIR, "README.md"), "# Not a preact page");
}

async function setupTestProjectWithNestedDirs() {
  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(path.join(PAGES_DIR, "blog"), { recursive: true });

  await writeFile(
    path.join(PAGES_DIR, "root.tsx"),
    `import { h } from "preact";
export default function RootPage() { return h("div", null, "Root"); }`,
  );
  await writeFile(
    path.join(PAGES_DIR, "blog", "index.tsx"),
    `import { h } from "preact";
export default function BlogIndex() { return h("div", null, "Blog Index"); }`,
  );
  await writeFile(
    path.join(PAGES_DIR, "blog", "post1.tsx"),
    `import { h } from "preact";
export default function Post1() { return h("div", null, "Post 1"); }`,
  );
}

async function setupTestProjectWithSpecialChars() {
  await mkdir(PAGES_DIR, { recursive: true });

  await writeFile(
    path.join(PAGES_DIR, "Special-Name.tsx"),
    `import { h } from "preact";
export default function SpecialName() { return h("div", null, "Special"); }`,
  );
  await writeFile(
    path.join(PAGES_DIR, "Component_123.tsx"),
    `import { h } from "preact";
export default function Component123() { return h("div", null, "123"); }`,
  );
}

async function setupTestProjectWithBasePage() {
  await mkdir(PAGES_DIR, { recursive: true });

  await writeFile(
    path.join(PAGES_DIR, "base-page.tsx"),
    `import { h } from "preact";
import { useContext } from "preact/hooks";
import { BaseContext } from "../../../../../../src/core/context";

export default function BasePage() {
  const base = useContext(BaseContext);
  return h("div", { "data-base": base }, "Base page");
}
`,
  );
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

describe("preact/build", () => {
  beforeEach(async () => {
    await resetTestProject();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTestProject();
  });

  describe("discoverPreactPages", () => {
    it("should discover preact pages from pages directory", async () => {
      const { preactFiles } = await discoverPreactPages();
      expect(preactFiles.length).toBe(3);
      expect(preactFiles.some((p) => p.absolute.endsWith("index.tsx"))).toBe(true);
      expect(preactFiles.some((p) => p.absolute.endsWith("about.ts"))).toBe(true);
    });

    it("should return Path objects for preact files", async () => {
      const { preactFiles } = await discoverPreactPages();
      for (const file of preactFiles) {
        expect(file).toBeInstanceOf(Path);
      }
    });

    it("should return empty array when no preact pages exist", async () => {
      await rm(PAGES_DIR, { recursive: true, force: true });
      await mkdir(PAGES_DIR, { recursive: true });
      const { preactFiles } = await discoverPreactPages();
      expect(preactFiles).toEqual([]);
    });

    it("should return empty array when no pages folder exist", async () => {
      await rm(PAGES_DIR, { recursive: true, force: true });
      const { preactFiles } = await discoverPreactPages();
      expect(preactFiles).toEqual([]);
    });

    it("should discover pages with various JS-related extensions", async () => {
      await resetTestProject(setupTestProjectWithExtensions);

      const { preactFiles } = await discoverPreactPages();

      expect(preactFiles.some((p) => p.absolute.endsWith(".ts"))).toBe(true);
      expect(preactFiles.some((p) => p.absolute.endsWith(".tsx"))).toBe(true);
      expect(preactFiles.some((p) => p.absolute.endsWith(".js"))).toBe(true);
      expect(preactFiles.some((p) => p.absolute.endsWith(".jsx"))).toBe(true);
      expect(preactFiles.some((p) => p.absolute.endsWith(".foo"))).toBe(false);
      expect(preactFiles.some((p) => p.absolute.endsWith(".md"))).toBe(false);
    });

    it("should handle nested directories within pages folder", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const { preactFiles } = await discoverPreactPages();

      expect(preactFiles.some((p) => p.absolute.endsWith("root.tsx"))).toBe(true);
      expect(preactFiles.some((p) => p.absolute.endsWith(path.join("blog", "index.tsx")))).toBe(true);
      expect(preactFiles.some((p) => p.absolute.endsWith(path.join("blog", "post1.tsx")))).toBe(true);
    });

    it("should map index files to the root route", async () => {
      const { preactFiles } = await discoverPreactPages();
      const indexFile = preactFiles.find((p) =>
        p.absolute.endsWith("index.tsx"),
      );
      expect(indexFile).toBeDefined();
    });

    it("should map nested index files to their directory route", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const { preactFiles } = await discoverPreactPages();
      const blogIndex = preactFiles.find(
        (p) =>
          p.absolute.endsWith(path.join("blog", "index.tsx")),
      );
      expect(blogIndex).toBeDefined();
    });

    it("should return Path objects with correct absolute paths", async () => {
      const { preactFiles } = await discoverPreactPages();

      expect(
        preactFiles.some(
          (p) => p.absolute === path.join(PAGES_DIR, "index.tsx"),
        ),
      ).toBe(true);
      expect(
        preactFiles.some((p) => p.absolute === path.join(PAGES_DIR, "about.ts")),
      ).toBe(true);
    });

    it("should handle pages with special characters in their names", async () => {
      await resetTestProject(setupTestProjectWithSpecialChars);
      const { preactFiles } = await discoverPreactPages();

      expect(preactFiles.length).toBe(2);
      expect(preactFiles.some((p) => p.absolute.endsWith("Special-Name.tsx"))).toBe(true);
      expect(preactFiles.some((p) => p.absolute.endsWith("Component_123.tsx"))).toBe(true);
    });
  });

  describe("prerenderPreactPages", () => {
    it("should handle empty page list", async () => {
      const { preactPages: rendered } = await prerenderPreactPages({ preactFiles: [] });
      expect(rendered).toEqual([]);
    });

    it("should prerender pages and return PreactPage objects", async () => {
      const { preactFiles: discovered } = await discoverPreactPages();
      const { preactPages: rendered } = await prerenderPreactPages({ preactFiles: discovered });

      expect(rendered.length).toBe(2);
      for (const entry of rendered) {
        expect(entry).toHaveProperty("url");
        expect(entry).toHaveProperty("file");
        expect(entry.file).toBeInstanceOf(Path);
        expect(entry.file.absolute).toContain(".cache");
        expect(entry.file.absolute.endsWith(".html")).toBe(true);
      }
    });

    it("should generate html files in cache directory", async () => {
      const { preactFiles: discovered } = await discoverPreactPages();

      await prerenderPreactPages({ preactFiles: discovered });

      const cacheDir = path.join(TEST_DIR, ".cache");
      expect(await exists(cacheDir)).toBe(true);

      const generatedFiles = await readdir(cacheDir);
      expect(generatedFiles.some((f) => f.match(/Home\..*\.html$/))).toBeTrue();
      expect(
        generatedFiles.some((f) => f.match(/About\..*\.html$/)),
      ).toBeTrue();
    });

    it("should write rendered html content to the cache file", async () => {
      const { preactFiles: discovered } = await discoverPreactPages();
      const { preactPages: rendered } = await prerenderPreactPages({ preactFiles: discovered });

      for (const page of rendered) {
        const content = await readFile(page.file.absolute, "utf-8");
        expect(content.length).toBeGreaterThan(0);
      }

      const aboutPage = rendered.find((p) => p.url === "/about");
      expect(aboutPage).toBeDefined();
      const aboutContent = await readFile(aboutPage!.file.absolute, "utf-8");
      expect(aboutContent).toContain("<h1>About</h1>");
    });

    it("should skip pages without default export", async () => {
      const { preactFiles: discovered } = await discoverPreactPages();
      const { preactPages: rendered } = await prerenderPreactPages({ preactFiles: discovered });

      expect(rendered.some((p) => p.url === "/NoDefault")).toBe(false);
    });

    it("should generate consistent hashes for the same page", async () => {
      const { preactFiles: discovered } = await discoverPreactPages();
      const { preactPages: rendered1 } = await prerenderPreactPages({ preactFiles: discovered });
      await resetTestProject();
      const { preactFiles: discovered2 } = await discoverPreactPages();
      const { preactPages: rendered2 } = await prerenderPreactPages({ preactFiles: discovered2 });

      expect(rendered1.length).toBe(rendered2.length);
      const urls1 = rendered1.map((p) => p.url).sort();
      const urls2 = rendered2.map((p) => p.url).sort();
      expect(urls1).toEqual(urls2);
      for (const url of urls1) {
        const p1 = rendered1.find((p) => p.url === url);
        const p2 = rendered2.find((p) => p.url === url);
        expect(p1?.file.absolute).toBe(p2?.file.absolute);
      }
    });

    it("should verify generated files exist", async () => {
      const { preactFiles: discovered } = await discoverPreactPages();
      const { preactPages: rendered } = await prerenderPreactPages({ preactFiles: discovered });
      for (const page of rendered) {
        expect(await exists(page.file.absolute)).toBe(true);
      }
    });

    it("should prerender a single page correctly", async () => {
      const { preactPages: rendered } = await prerenderPreactPages({
        preactFiles: [Path.create(path.join(PAGES_DIR, "about.ts"))],
      });

      expect(rendered.length).toBe(1);
      expect(rendered[0]!.url).toBe("/about");
      expect(rendered[0]!.file.absolute).toMatch(
        /\.cache[\\/]About\..+\.html$/,
      );
    });

    it("should prerender multiple pages correctly", async () => {
      const { preactPages: rendered } = await prerenderPreactPages({
        preactFiles: [
          Path.create(path.join(PAGES_DIR, "index.tsx")),
          Path.create(path.join(PAGES_DIR, "about.ts")),
        ],
      });

      expect(rendered.length).toBe(2);
      expect(rendered.map((p) => p.url)).toEqual(["/", "/about"]);
      const [home, about] = rendered;
      expect(home!.file.absolute).toMatch(/\.cache[\\/]Home\..+\.html$/);
      expect(about!.file.absolute).toMatch(/\.cache[\\/]About\..+\.html$/);
    });

    it("should pass the base to prerendered preact pages", async () => {
      await resetTestProject(setupTestProjectWithBasePage);
      const { preactFiles: discovered } = await discoverPreactPages();
      const { preactPages: rendered } = await prerenderPreactPages({ preactFiles: discovered, base: "/base" });

      const basePage = rendered.find((p) => p.url === "/base-page");
      expect(basePage).toBeDefined();
      const content = await readFile(basePage!.file.absolute, "utf-8");
      expect(content).toContain('data-base="/base"');
    });
  });
});
