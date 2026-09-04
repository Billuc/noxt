/**
 * Integration tests for src/markdown/build.ts
 */
import {
  discoverMarkdownPages,
  prerenderMarkdownPages,
} from "../../../src/markdown/build";
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

const TEST_DIR = path.join(import.meta.dir, "test-markdown-project");
const PAGES_DIR = path.join(TEST_DIR, "src", "pages");
const originalCwd = process.cwd();

async function setupTestProject() {
  await mkdir(PAGES_DIR, { recursive: true });

  await writeFile(
    path.join(PAGES_DIR, "index.md"),
    `# Home

Welcome to the home page.
`,
  );

  await writeFile(
    path.join(PAGES_DIR, "about.md"),
    `# About Us

Some *introductory* text.
`,
  );

  await writeFile(
    path.join(PAGES_DIR, "NoFrontmatter.md"),
    `Just a plain markdown file with no frontmatter.
`,
  );
}

async function setupTestProjectWithExtensions() {
  await mkdir(PAGES_DIR, { recursive: true });

  await writeFile(path.join(PAGES_DIR, "Post.md"), "# A post");
  await writeFile(
    path.join(PAGES_DIR, "Readme.markdown"),
    "# A .markdown file",
  );
  await writeFile(path.join(PAGES_DIR, "Note.mdx"), "# A .mdx file");
  await writeFile(
    path.join(PAGES_DIR, "Page.tsx"),
    `import { h } from "preact";
export default function Page() { return h("div", null, "TSX"); }`,
  );
  await writeFile(path.join(PAGES_DIR, "Data.foo"), `not a markdown page`);
}

async function setupTestProjectWithNestedDirs() {
  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(path.join(PAGES_DIR, "blog"), { recursive: true });

  await writeFile(path.join(PAGES_DIR, "root.md"), `# Root page`);
  await writeFile(path.join(PAGES_DIR, "blog", "index.md"), `# Blog index`);
  await writeFile(path.join(PAGES_DIR, "blog", "post1.md"), `# Post 1`);
}

async function setupTestProjectWithSpecialChars() {
  await mkdir(PAGES_DIR, { recursive: true });

  await writeFile(path.join(PAGES_DIR, "Special-Name.md"), `# Special name`);
  await writeFile(path.join(PAGES_DIR, "Component_123.md"), `# Component 123`);
}

async function setupTestProjectWithLayouts() {
  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(path.join(TEST_DIR, "src", "layouts"), { recursive: true });

  await writeFile(
    path.join(TEST_DIR, "src", "layouts", "BlogLayout.tsx"),
    `import { h, type ComponentChildren } from "preact";

export default function BlogLayout({
  children,
}: {
  children?: ComponentChildren;
}) {
  return h("div", { class: "blog-layout" }, [
    h("header", null, "My Blog"),
    children,
  ]);
}
`,
  );

  await writeFile(
    path.join(PAGES_DIR, "with-layout.md"),
    `---
layout: src/layouts/BlogLayout.tsx
---

# My Post
`,
  );

  await writeFile(
    path.join(PAGES_DIR, "broken-layout.md"),
    `---
layout: src/layouts/MissingLayout.tsx
---

# Broken
`,
  );
}

async function setupTestProjectWithBaseLayout() {
  await mkdir(PAGES_DIR, { recursive: true });
  await mkdir(path.join(TEST_DIR, "src", "layouts"), { recursive: true });

  await writeFile(
    path.join(TEST_DIR, "src", "layouts", "BaseLayout.tsx"),
    `import { h, type ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import { UtilsContext } from "noxt/runtime";

export default function BaseLayout({
  children,
}: {
  children?: ComponentChildren;
}) {
  const { asset } = useContext(UtilsContext);
  return h("div", { "data-asset": asset("/style.css") }, children);
}
`,
  );

  await writeFile(
    path.join(PAGES_DIR, "with-base.md"),
    `---
layout: src/layouts/BaseLayout.tsx
---

# Base page
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

describe("markdown/build", () => {
  beforeEach(async () => {
    await resetTestProject();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTestProject();
  });

  describe("discoverMarkdownPages", () => {
    it("should discover markdown pages from pages directory", async () => {
      const { markdownFiles } = await discoverMarkdownPages();
      expect(markdownFiles.length).toBe(3);
      // The URL is computed later, so we check file names
      expect(markdownFiles.some((p) => p.absolute.endsWith("index.md"))).toBe(
        true,
      );
      expect(markdownFiles.some((p) => p.absolute.endsWith("about.md"))).toBe(
        true,
      );
      expect(
        markdownFiles.some((p) => p.absolute.endsWith("NoFrontmatter.md")),
      ).toBe(true);
    });

    it("should return Path objects for markdown files", async () => {
      const { markdownFiles } = await discoverMarkdownPages();
      for (const file of markdownFiles) {
        expect(file).toBeInstanceOf(Path);
      }
    });

    it("should return empty array when no markdown pages exist", async () => {
      await rm(PAGES_DIR, { recursive: true, force: true });
      await mkdir(PAGES_DIR, { recursive: true });
      const { markdownFiles } = await discoverMarkdownPages();
      expect(markdownFiles).toEqual([]);
    });

    it("should only discover .md files", async () => {
      await resetTestProject(setupTestProjectWithExtensions);
      const { markdownFiles } = await discoverMarkdownPages();

      expect(markdownFiles.length).toBe(1);
      expect(markdownFiles[0]!.absolute.endsWith(".md")).toBe(true);
      expect(markdownFiles.some((p) => p.absolute.endsWith(".markdown"))).toBe(
        false,
      );
      expect(markdownFiles.some((p) => p.absolute.endsWith(".mdx"))).toBe(
        false,
      );
      expect(markdownFiles.some((p) => p.absolute.endsWith(".tsx"))).toBe(
        false,
      );
      expect(markdownFiles.some((p) => p.absolute.endsWith(".foo"))).toBe(
        false,
      );
    });

    it("should handle nested directories within pages folder", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const { markdownFiles } = await discoverMarkdownPages();

      expect(markdownFiles.some((p) => p.absolute.endsWith("root.md"))).toBe(
        true,
      );
      expect(
        markdownFiles.some((p) =>
          p.absolute.endsWith(path.join("blog", "index.md")),
        ),
      ).toBe(true);
      expect(
        markdownFiles.some((p) =>
          p.absolute.endsWith(path.join("blog", "post1.md")),
        ),
      ).toBe(true);
    });

    it("should map index files to the root route", async () => {
      const { markdownFiles } = await discoverMarkdownPages();
      const indexFile = markdownFiles.find((p) =>
        p.absolute.endsWith("index.md"),
      );
      expect(indexFile).toBeDefined();
    });

    it("should map nested index files to their directory route", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const { markdownFiles } = await discoverMarkdownPages();
      const blogIndex = markdownFiles.find((p) =>
        p.absolute.endsWith(path.join("blog", "index.md")),
      );
      expect(blogIndex).toBeDefined();
    });

    it("should return Path objects with correct absolute paths", async () => {
      const { markdownFiles } = await discoverMarkdownPages();
      expect(
        markdownFiles.some(
          (p) => p.absolute === path.join(PAGES_DIR, "index.md"),
        ),
      ).toBe(true);
      expect(
        markdownFiles.some(
          (p) => p.absolute === path.join(PAGES_DIR, "about.md"),
        ),
      ).toBe(true);
      expect(
        markdownFiles.some(
          (p) => p.absolute === path.join(PAGES_DIR, "NoFrontmatter.md"),
        ),
      ).toBe(true);
    });

    it("should handle pages with special characters in their names", async () => {
      await resetTestProject(setupTestProjectWithSpecialChars);
      const { markdownFiles } = await discoverMarkdownPages();

      expect(markdownFiles.length).toBe(2);
      expect(
        markdownFiles.some((p) => p.absolute.endsWith("Special-Name.md")),
      ).toBe(true);
      expect(
        markdownFiles.some((p) => p.absolute.endsWith("Component_123.md")),
      ).toBe(true);
    });
  });

  describe("prerenderMarkdownPages", () => {
    it("should handle empty page list", async () => {
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: [],
      });
      expect(rendered).toEqual([]);
    });

    it("should prerender pages and return MarkdownPage objects", async () => {
      const { markdownFiles: discovered } = await discoverMarkdownPages();
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: discovered,
      });

      expect(rendered.length).toBe(3);
      for (const entry of rendered) {
        expect(entry).toHaveProperty("url");
        expect(entry).toHaveProperty("file");
        expect(entry.file).toBeInstanceOf(Path);
        expect(entry.file.absolute).toContain(".cache");
        expect(entry.file.absolute.endsWith(".html")).toBe(true);
      }
    });

    it("should generate html files in cache directory", async () => {
      const { markdownFiles: discovered } = await discoverMarkdownPages();

      await prerenderMarkdownPages({ markdownFiles: discovered });

      const cacheDir = path.join(TEST_DIR, ".cache");
      expect(await exists(cacheDir)).toBe(true);

      const generatedFiles = await readdir(cacheDir);
      expect(
        generatedFiles.some((f) => f.match(/index\..*\.html$/)),
      ).toBeTrue();
      expect(
        generatedFiles.some((f) => f.match(/about\..*\.html$/)),
      ).toBeTrue();
    });

    it("should write rendered markdown html content to the cache file", async () => {
      const { markdownFiles: discovered } = await discoverMarkdownPages();
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: discovered,
      });

      const aboutPage = rendered.find((p) => p.url === "/about");
      expect(aboutPage).toBeDefined();
      const aboutContent = await readFile(aboutPage!.file.absolute, "utf-8");
      expect(aboutContent).toContain("<h1>About Us</h1>");
      expect(aboutContent).toContain("<em>introductory</em>");
      expect(aboutContent).toContain("<html");
    });

    it("should use the custom layout defined in frontmatter", async () => {
      await resetTestProject(setupTestProjectWithLayouts);
      const { markdownFiles: discovered } = await discoverMarkdownPages();
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: discovered,
      });

      const layoutPage = rendered.find((p) => p.url === "/with-layout");
      expect(layoutPage).toBeDefined();
      const layoutContent = await readFile(layoutPage!.file.absolute, "utf-8");
      expect(layoutContent).toContain(
        '<div class="blog-layout"><header>My Blog</header><h1>My Post</h1>\n</div>',
      );
    });

    it("should skip pages whose layout cannot be resolved", async () => {
      await resetTestProject(setupTestProjectWithLayouts);
      const { markdownFiles: discovered } = await discoverMarkdownPages();
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: discovered,
      });

      expect(rendered.some((p) => p.url === "/broken-layout")).toBe(false);
      expect(rendered.some((p) => p.url === "/with-layout")).toBe(true);
    });

    it("should generate consistent file names for the same page", async () => {
      const { markdownFiles: discovered } = await discoverMarkdownPages();
      const { markdownPages: rendered1 } = await prerenderMarkdownPages({
        markdownFiles: discovered,
      });
      await resetTestProject();
      const { markdownFiles: discovered2 } = await discoverMarkdownPages();
      const { markdownPages: rendered2 } = await prerenderMarkdownPages({
        markdownFiles: discovered2,
      });

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
      const { markdownFiles: discovered } = await discoverMarkdownPages();
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: discovered,
      });
      for (const page of rendered) {
        expect(await exists(page.file.absolute)).toBe(true);
      }
    });

    it("should prerender a single page correctly", async () => {
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: [Path.fromAbsolute(path.join(PAGES_DIR, "about.md"))],
      });

      expect(rendered.length).toBe(1);
      expect(rendered[0]!.url).toBe("/about");
      expect(rendered[0]!.file.absolute).toMatch(
        /\.cache[\\/]about\.[a-zA-Z0-9-_]+\.html$/,
      );
    });

    it("should prerender multiple pages correctly", async () => {
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: [
          Path.fromAbsolute(path.join(PAGES_DIR, "index.md")),
          Path.fromAbsolute(path.join(PAGES_DIR, "about.md")),
          Path.fromAbsolute(path.join(PAGES_DIR, "NoFrontmatter.md")),
        ],
      });

      expect(rendered.length).toBe(3);
      expect(rendered.map((p) => p.url)).toEqual([
        "/",
        "/about",
        "/NoFrontmatter",
      ]);
      expect(rendered[0]!.file.absolute).toMatch(
        /\.cache[\\/]index\.[a-zA-Z0-9-_]+\.html$/,
      );
      expect(rendered[1]!.file.absolute).toMatch(
        /\.cache[\\/]about\.[a-zA-Z0-9-_]+\.html$/,
      );
      expect(rendered[2]!.file.absolute).toMatch(
        /\.cache[\\/]NoFrontmatter\.[a-zA-Z0-9-_]+\.html$/,
      );
    });

    it("should pass utils with base to prerendered markdown pages", async () => {
      await resetTestProject(setupTestProjectWithBaseLayout);
      const { markdownFiles: discovered } = await discoverMarkdownPages();
      const { markdownPages: rendered } = await prerenderMarkdownPages({
        markdownFiles: discovered,
        base: "/docs",
        asset: (assetId) => "/docs" + assetId,
      });

      const basePage = rendered.find((p) => p.url === "/with-base");
      expect(basePage).toBeDefined();
      const content = await readFile(basePage!.file.absolute, "utf-8");
      expect(content).toContain('data-asset="/docs/style.css"');
    });
  });
});
