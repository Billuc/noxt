/**
 * Integration tests for src/shell/prepare.ts
 */
import { preparePreact, prepareMarkdown } from "../../src/static/prepare";
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import path from "node:path";
import { rm, mkdir, readdir, writeFile } from "node:fs/promises";

const CACHE_DIR = path.resolve(".cache");
const TEST_PREACT_DIR = path.resolve("test-preact-temp");

async function setupCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function cleanupCacheDir() {
  await rm(CACHE_DIR, { recursive: true, force: true });
}

async function createPreactFile(
  name: string,
  content: string,
): Promise<string> {
  const filePath = path.join(TEST_PREACT_DIR, `${name}.tsx`);
  await writeFile(filePath, content);
  return filePath;
}

describe("preparePreact", () => {
  beforeEach(async () => {
    await setupCacheDir();
    await mkdir(TEST_PREACT_DIR, { recursive: true });
  });

  afterEach(async () => {
    await cleanupCacheDir();
    await rm(TEST_PREACT_DIR, { recursive: true, force: true });
  });

  it("should generate HTML file in .cache", async () => {
    const filePath = await createPreactFile(
      "TestComponent",
      `
      import { h } from "preact";
      export default function TestComponent() {
        return h("div", { class: "test-page" }, h("h1", {}, "Hello World"));
      }
    `,
    );

    const prerenderPath = await preparePreact(filePath);

    expect(prerenderPath.relativeToCwd()).toContain(".cache");
    expect(prerenderPath.relativeToCwd()).toContain(".html");

    const files = await readdir(CACHE_DIR);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith(".html"))).toBe(true);
  });

  it("should generate file with component name in filename", async () => {
    const filePath = await createPreactFile(
      "TestComponent",
      `
      import { h } from "preact";
      export default function TestComponent() {
        return h("div", { class: "test-page" }, h("h1", {}, "Hello World"));
      }
    `,
    );

    const prerenderPath = await preparePreact(filePath);

    const fileName = path.basename(prerenderPath.relativeToCwd());
    expect(fileName).toContain("TestComponent");
    expect(fileName).toContain(".html");
  });

  it("should use displayName in filename when available", async () => {
    const filePath = await createPreactFile(
      "MyPage",
      `
      import { h } from "preact";
      function MyPage() {
        return h("div", {}, "Named");
      }
      MyPage.displayName = "MyPage";
      export default MyPage;
    `,
    );

    const prerenderPath = await preparePreact(filePath);

    const fileName = path.basename(prerenderPath.relativeToCwd());
    expect(fileName).toContain("MyPage");
  });

  it("should generate file with hash in filename", async () => {
    const filePath = await createPreactFile(
      "TestComponent",
      `
      import { h } from "preact";
      export default function TestComponent() {
        return h("div", { class: "test-page" }, h("h1", {}, "Hello World"));
      }
    `,
    );

    const prerenderPath = await preparePreact(filePath);

    const fileName = path.basename(prerenderPath.relativeToCwd());
    const parts = fileName.split(".");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("TestComponent");
    expect(parts[2]).toBe("html");
    expect(parts[1]).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("should write valid HTML content to file", async () => {
    const filePath = await createPreactFile(
      "TestComponent",
      `
      import { h } from "preact";
      export default function TestComponent() {
        return h("div", { class: "test-page" }, h("h1", {}, "Hello World"));
      }
    `,
    );

    const prerenderPath = await preparePreact(filePath);

    const content = await Bun.file(prerenderPath.absolute).text();

    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("<h1>Hello World</h1>");
  });

  it("should generate consistent hash for same component", async () => {
    const filePath = await createPreactFile(
      "TestComponent",
      `
      import { h } from "preact";
      export default function TestComponent() {
        return h("div", { class: "test-page" }, h("h1", {}, "Hello World"));
      }
    `,
    );

    const prerenderPath1 = await preparePreact(filePath);
    await cleanupCacheDir();
    await setupCacheDir();
    const prerenderPath2 = await preparePreact(filePath);

    const fileName1 = path.basename(prerenderPath1.relativeToCwd());
    const fileName2 = path.basename(prerenderPath2.relativeToCwd());

    expect(fileName1).toBe(fileName2);
  });

  it("should generate different hashes for different components", async () => {
    const filePathA = await createPreactFile(
      "ComponentA",
      `
      import { h } from "preact";
      export default function ComponentA() {
        return h("div", {}, "A");
      }
    `,
    );
    const filePathB = await createPreactFile(
      "ComponentB",
      `
      import { h } from "preact";
      export default function ComponentB() {
        return h("div", {}, "B");
      }
    `,
    );

    const prerenderPath1 = await preparePreact(filePathA);
    const prerenderPath2 = await preparePreact(filePathB);

    const fileName1 = path.basename(prerenderPath1.relativeToCwd());
    const fileName2 = path.basename(prerenderPath2.relativeToCwd());

    expect(fileName1).not.toBe(fileName2);
  });
});

describe("prepareMarkdown", () => {
  const TEST_MD_DIR = path.resolve("test-md-temp");

  beforeEach(async () => {
    await setupCacheDir();
    await mkdir(TEST_MD_DIR, { recursive: true });
  });

  afterEach(async () => {
    await cleanupCacheDir();
    await rm(TEST_MD_DIR, { recursive: true, force: true });
  });

  it("should generate HTML file in .cache from markdown", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "test.md");
    await writeFile(markdownPath, "# Hello Markdown");

    const prerenderPath = await prepareMarkdown(markdownPath);

    expect(prerenderPath.relativeToCwd()).toContain(".cache");
    expect(prerenderPath.relativeToCwd()).toContain(".html");

    const files = await readdir(CACHE_DIR);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith(".html"))).toBe(true);
  });

  it("should generate file with markdown basename in filename", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "about.md");
    await writeFile(markdownPath, "# About Page");

    const prerenderPath = await prepareMarkdown(markdownPath);

    const fileName = path.basename(prerenderPath.relativeToCwd());
    expect(fileName).toContain("about");
    expect(fileName).toContain(".html");
  });

  it("should generate file with hash in filename", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "test.md");
    await writeFile(markdownPath, "# Test");

    const prerenderPath = await prepareMarkdown(markdownPath);

    const fileName = path.basename(prerenderPath.relativeToCwd());
    const parts = fileName.split(".");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("test");
    expect(parts[2]).toBe("html");
    expect(parts[1]).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("should write valid HTML content from markdown", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "content.md");
    await writeFile(markdownPath, "# Hello\n\nThis is **markdown**");

    const prerenderPath = await prepareMarkdown(markdownPath);

    const content = await Bun.file(prerenderPath.absolute).text();

    expect(content).toEqualIgnoringWhitespace(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <h1>Hello</h1>
          <p>This is <strong>markdown</strong></p>
        </body>
      </html>  
    `);
  });

  it("should handle markdown with frontmatter", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "frontmatter.md");
    const markdownContent = `---
title: Test Page
author: Test Author
---

# Frontmatter Test`;
    await writeFile(markdownPath, markdownContent);

    const prerenderPath = await prepareMarkdown(markdownPath);

    const content = await Bun.file(prerenderPath.absolute).text();

    expect(content).toEqualIgnoringWhitespace(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <h1>Frontmatter Test</h1>
        </body>
      </html>  
    `);
  });

  it("should normalize line endings in markdown", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "lineendings.md");
    // Write with CRLF line endings
    await writeFile(markdownPath, "# Line 1\r\n# Line 2\r\n");

    const prerenderPath = await prepareMarkdown(markdownPath);

    const content = await Bun.file(prerenderPath.absolute).text();

    // Should not contain \r\n
    expect(content).not.toContain("\r\n");
    expect(content).toContain("<h1>Line 1</h1>");
    expect(content).toContain("<h1>Line 2</h1>");
  });

  it("should use default layout when no layout specified", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "default-layout.md");
    await writeFile(markdownPath, "# Default Layout Test");

    const prerenderPath = await prepareMarkdown(markdownPath);

    const content = await Bun.file(prerenderPath.absolute).text();

    // Default layout wraps content in html with head and body
    expect(content).toContain("<html>");
    expect(content).toContain("<head></head>");
    expect(content).toContain("<body>");
  });

  it("should use custom layout when specified in frontmatter", async () => {
    // Create a custom layout file
    const layoutPath = path.join(TEST_MD_DIR, "CustomLayout.tsx");
    const layoutContent = `
      import { html } from "htm/preact";

      export default function CustomLayout({ title, children }) {
        return html\`<html>
          <head><title>\${title}</title></head>
          <body class="custom">\${children}</body>
        </html>\`;
      }
    `;
    await Bun.write(layoutPath, layoutContent);

    const markdownPath = path.join(TEST_MD_DIR, "custom-layout.md");
    const markdownContent = `---
layout: ${layoutPath}
title: Custom Layout Page
---

# Custom Layout Test`;
    await writeFile(markdownPath, markdownContent);

    const prerenderPath = await prepareMarkdown(markdownPath);
    const content = await Bun.file(prerenderPath.absolute).text();

    expect(content).toEqualIgnoringWhitespace(`
      <!DOCTYPE html>
      <html>
        <head><title>Custom Layout Page</title></head>
        <body class="custom">
          <h1>Custom Layout Test</h1>
        </body>
      </html>  
    `);
  });

  it("should generate consistent hash for same markdown content", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "consistent.md");
    const content = "# Consistent Test";
    await writeFile(markdownPath, content);

    const prerenderPath1 = await prepareMarkdown(markdownPath);
    await cleanupCacheDir();
    await setupCacheDir();
    await writeFile(markdownPath, content);
    const prerenderPath2 = await prepareMarkdown(markdownPath);

    const fileName1 = path.basename(prerenderPath1.relativeToCwd());
    const fileName2 = path.basename(prerenderPath2.relativeToCwd());

    expect(fileName1).toBe(fileName2);
  });

  it("should generate different hashes for different markdown filenames", async () => {
    const markdownPath1 = path.join(TEST_MD_DIR, "content_a.md");
    await writeFile(markdownPath1, "# Content");

    const prerenderPath1 = await prepareMarkdown(markdownPath1);

    const markdownPath2 = path.join(TEST_MD_DIR, "content_b.md");
    await writeFile(markdownPath2, "# Content");

    const prerenderPath2 = await prepareMarkdown(markdownPath2);

    const fileName1 = path.basename(prerenderPath1.relativeToCwd());
    const fileName2 = path.basename(prerenderPath2.relativeToCwd());

    expect(fileName1).not.toBe(fileName2);
  });

  it("should handle malformed frontmatter gracefully", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "malformed.md");
    const markdownContent = `---
not valid yaml
---

# Malformed Test`;
    await writeFile(markdownPath, markdownContent);

    // Should not throw
    const prerenderPath = await prepareMarkdown(markdownPath);

    const content = await Bun.file(prerenderPath.absolute).text();

    expect(content).toEqualIgnoringWhitespace(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <h1>Malformed Test</h1>
        </body>
      </html>
    `);
  });

  it("should handle unclosed frontmatter gracefully", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "unclosed.md");
    const markdownContent = `---
title: Unclosed

# Unclosed Test`;
    await writeFile(markdownPath, markdownContent);

    // Should not throw
    const prerenderPath = await prepareMarkdown(markdownPath);

    const content = await Bun.file(prerenderPath.absolute).text();

    expect(content).toEqualIgnoringWhitespace(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <hr />
          <p>title: Unclosed</p>
          <h1>Unclosed Test</h1>
        </body>
      </html>
    `);
  });
});
