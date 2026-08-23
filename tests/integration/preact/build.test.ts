/**
 * Integration tests for src/preact/build.ts
 */
import {
  discoverPreactPages,
  prerenderPreactPages,
} from "../../../src/preact/build";
import type { PreactFile } from "../../../src/preact/types";
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
      const pages = await discoverPreactPages();
      expect(pages.length).toBe(3);
      expect(pages.some((p) => p.url === "/")).toBe(true);
      expect(pages.some((p) => p.url === "/about")).toBe(true);
    });

    it("should return PreactPageEntry objects with url and file", async () => {
      const pages = await discoverPreactPages();
      for (const entry of pages) {
        expect(entry).toHaveProperty("url");
        expect(entry).toHaveProperty("file");
        expect(entry.file).toBeInstanceOf(Path);
        expect(typeof entry.url).toBe("string");
        expect(entry.url.startsWith("/")).toBe(true);
      }
    });

    it("should return empty array when no preact pages exist", async () => {
      await rm(PAGES_DIR, { recursive: true, force: true });
      await mkdir(PAGES_DIR, { recursive: true });
      const pages = await discoverPreactPages();
      expect(pages).toEqual([]);
    });

    it("should return empty array when no pages folder exist", async () => {
      await rm(PAGES_DIR, { recursive: true, force: true });
      const pages = await discoverPreactPages();
      expect(pages).toEqual([]);
    });

    it("should discover pages with various JS-related extensions", async () => {
      await resetTestProject(setupTestProjectWithExtensions);

      const pages = await discoverPreactPages();

      expect(pages.some((p) => p.file.absolute.endsWith(".ts"))).toBe(true);
      expect(pages.some((p) => p.file.absolute.endsWith(".tsx"))).toBe(true);
      expect(pages.some((p) => p.file.absolute.endsWith(".js"))).toBe(true);
      expect(pages.some((p) => p.file.absolute.endsWith(".jsx"))).toBe(true);
      expect(pages.some((p) => p.file.absolute.endsWith(".foo"))).toBe(false);
      expect(pages.some((p) => p.file.absolute.endsWith(".md"))).toBe(false);
    });

    it("should handle nested directories within pages folder", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const pages = await discoverPreactPages();

      expect(pages.some((p) => p.url === "/root")).toBe(true);
      expect(pages.some((p) => p.url === "/blog")).toBe(true);
      expect(pages.some((p) => p.url === "/blog/post1")).toBe(true);
    });

    it("should map index files to the root route", async () => {
      const pages = await discoverPreactPages();
      const indexEntry = pages.find((p) =>
        p.file.absolute.endsWith("index.tsx"),
      );
      expect(indexEntry?.url).toBe("/");
    });

    it("should map nested index files to their directory route", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const pages = await discoverPreactPages();
      const blogIndex = pages.find(
        (p) =>
          p.url === "/blog" &&
          p.file.absolute.endsWith(path.join("blog", "index.tsx")),
      );
      expect(blogIndex).toBeDefined();
    });

    it("should return Path objects with correct absolute paths", async () => {
      const pages = await discoverPreactPages();

      expect(
        pages.some(
          (p) => p.file.absolute === path.join(PAGES_DIR, "index.tsx"),
        ),
      ).toBe(true);
      expect(
        pages.some((p) => p.file.absolute === path.join(PAGES_DIR, "about.ts")),
      ).toBe(true);
    });

    it("should handle pages with special characters in their names", async () => {
      await resetTestProject(setupTestProjectWithSpecialChars);
      const pages = await discoverPreactPages();

      expect(pages.length).toBe(2);
      expect(pages.some((p) => p.url === "/Special-Name")).toBe(true);
      expect(pages.some((p) => p.url === "/Component_123")).toBe(true);
    });
  });

  describe("prerenderPreactPages", () => {
    it("should handle empty page list", async () => {
      const rendered = await prerenderPreactPages([]);
      expect(rendered).toEqual([]);
    });

    it("should prerender pages and return PreactPage objects", async () => {
      const discovered = await discoverPreactPages();
      const rendered = await prerenderPreactPages(discovered);

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
      const discovered = await discoverPreactPages();

      await prerenderPreactPages(discovered);

      const cacheDir = path.join(TEST_DIR, ".cache");
      expect(await exists(cacheDir)).toBe(true);

      const generatedFiles = await readdir(cacheDir);
      expect(generatedFiles.some((f) => f.match(/Home\..*\.html$/))).toBeTrue();
      expect(
        generatedFiles.some((f) => f.match(/About\..*\.html$/)),
      ).toBeTrue();
    });

    it("should write rendered html content to the cache file", async () => {
      const discovered = await discoverPreactPages();
      const rendered = await prerenderPreactPages(discovered);

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
      const discovered = await discoverPreactPages();
      const rendered = await prerenderPreactPages(discovered);

      expect(rendered.some((p) => p.url === "/NoDefault")).toBe(false);
    });

    it("should generate consistent hashes for the same page", async () => {
      const discovered = await discoverPreactPages();
      const rendered1 = await prerenderPreactPages(discovered);
      await resetTestProject();
      const discovered2 = await discoverPreactPages();
      const rendered2 = await prerenderPreactPages(discovered2);

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
      const discovered = await discoverPreactPages();
      const rendered = await prerenderPreactPages(discovered);
      for (const page of rendered) {
        expect(await exists(page.file.absolute)).toBe(true);
      }
    });

    it("should prerender a single page correctly", async () => {
      const entries: PreactFile[] = [
        {
          url: "/about",
          file: Path.create(path.join(PAGES_DIR, "about.ts")),
        },
      ];
      const rendered = await prerenderPreactPages(entries);

      expect(rendered.length).toBe(1);
      expect(rendered[0]!.url).toBe("/about");
      expect(rendered[0]!.file.absolute).toMatch(
        /\.cache[\\/]About\..+\.html$/,
      );
    });

    it("should prerender multiple pages correctly", async () => {
      const entries: PreactFile[] = [
        {
          url: "/",
          file: Path.create(path.join(PAGES_DIR, "index.tsx")),
        },
        {
          url: "/about",
          file: Path.create(path.join(PAGES_DIR, "about.ts")),
        },
      ];
      const rendered = await prerenderPreactPages(entries);

      expect(rendered.length).toBe(2);
      expect(rendered.map((p) => p.url)).toEqual(["/", "/about"]);
      const [home, about] = rendered;
      expect(home!.file.absolute).toMatch(/\.cache[\\/]Home\..+\.html$/);
      expect(about!.file.absolute).toMatch(/\.cache[\\/]About\..+\.html$/);
    });

    it("should pass the base to prerendered preact pages", async () => {
      await resetTestProject(setupTestProjectWithBasePage);
      const discovered = await discoverPreactPages();
      const rendered = await prerenderPreactPages(discovered, "/base");

      const basePage = rendered.find((p) => p.url === "/base-page");
      expect(basePage).toBeDefined();
      const content = await readFile(basePage!.file.absolute, "utf-8");
      expect(content).toContain('data-base="/base"');
    });
  });
});
