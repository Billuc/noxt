/**
 * Integration tests for src/shell/prepare.ts
 */
import { preparePreact, prepareMarkdown } from "../../src/shell/prepare";
import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { h } from "preact";
import path from "node:path";
import { rm, mkdir, readdir, writeFile } from "node:fs/promises";

const CACHE_DIR = path.resolve(".cache");

async function setupCacheDir() {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function cleanupCacheDir() {
  await rm(CACHE_DIR, { recursive: true, force: true });
}

// Test Preact component
const TestPreactComponent = () =>
  h("div", { class: "test-page" }, h("h1", {}, "Hello World"));

// Named component for testing displayName
const NamedPreactComponent = () => h("div", {}, "Named");
NamedPreactComponent.displayName = "MyPage";

describe("preparePreact", () => {
  beforeEach(async () => {
    await setupCacheDir();
  });

  afterEach(async () => {
    await cleanupCacheDir();
  });

  it("should generate HTML file in .cache", async () => {
    const prerenderPath = await preparePreact(TestPreactComponent);

    expect(prerenderPath).toContain(".cache");
    expect(prerenderPath).toContain(".html");

    const files = await readdir(CACHE_DIR);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith(".html"))).toBe(true);
  });

  it("should generate file with component name in filename", async () => {
    const prerenderPath = await preparePreact(TestPreactComponent);

    const fileName = path.basename(prerenderPath);
    expect(fileName).toContain("TestPreactComponent");
    expect(fileName).toContain(".html");
  });

  it("should use displayName in filename when available", async () => {
    const prerenderPath = await preparePreact(NamedPreactComponent);

    const fileName = path.basename(prerenderPath);
    expect(fileName).toContain("MyPage");
    expect(fileName).not.toContain("NamedPreactComponent");
  });

  it("should generate file with hash in filename", async () => {
    const prerenderPath = await preparePreact(TestPreactComponent);

    const fileName = path.basename(prerenderPath);
    // Should have format: Name.hash.html
    const parts = fileName.split(".");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("TestPreactComponent");
    expect(parts[2]).toBe("html");
    // Hash should be a valid base64url string
    expect(parts[1]).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it("should write valid HTML content to file", async () => {
    const prerenderPath = await preparePreact(TestPreactComponent);

    const content = await Bun.file(prerenderPath).text();

    expect(content).toEqualIgnoringWhitespace(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div class="test-page">
            <h1>Hello World</h1>
          </div>
        </body>
      </html>
      `);
  });

  it("should generate consistent hash for same component", async () => {
    const prerenderPath1 = await preparePreact(TestPreactComponent);
    await cleanupCacheDir();
    await setupCacheDir();
    const prerenderPath2 = await preparePreact(TestPreactComponent);

    const fileName1 = path.basename(prerenderPath1);
    const fileName2 = path.basename(prerenderPath2);

    expect(fileName1).toBe(fileName2);
  });

  it("should generate different hashes for different components", async () => {
    const ComponentA = () => h("div", {}, "A");
    const ComponentB = () => h("div", {}, "B");

    const prerenderPath1 = await preparePreact(ComponentA);
    const prerenderPath2 = await preparePreact(ComponentB);

    const fileName1 = path.basename(prerenderPath1);
    const fileName2 = path.basename(prerenderPath2);

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

    expect(prerenderPath).toContain(".cache");
    expect(prerenderPath).toContain(".html");

    const files = await readdir(CACHE_DIR);
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith(".html"))).toBe(true);
  });

  it("should generate file with markdown basename in filename", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "about.md");
    await writeFile(markdownPath, "# About Page");

    const prerenderPath = await prepareMarkdown(markdownPath);

    const fileName = path.basename(prerenderPath);
    expect(fileName).toContain("about");
    expect(fileName).toContain(".html");
  });

  it("should generate file with hash in filename", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "test.md");
    await writeFile(markdownPath, "# Test");

    const prerenderPath = await prepareMarkdown(markdownPath);

    const fileName = path.basename(prerenderPath);
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

    const content = await Bun.file(prerenderPath).text();

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

    const content = await Bun.file(prerenderPath).text();

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

    const content = await Bun.file(prerenderPath).text();

    // Should not contain \r\n
    expect(content).not.toContain("\r\n");
    expect(content).toContain("<h1>Line 1</h1>");
    expect(content).toContain("<h1>Line 2</h1>");
  });

  it("should use default layout when no layout specified", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "default-layout.md");
    await writeFile(markdownPath, "# Default Layout Test");

    const prerenderPath = await prepareMarkdown(markdownPath);

    const content = await Bun.file(prerenderPath).text();

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
    const content = await Bun.file(prerenderPath).text();

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

    const fileName1 = path.basename(prerenderPath1);
    const fileName2 = path.basename(prerenderPath2);

    expect(fileName1).toBe(fileName2);
  });

  it("should generate different hashes for different markdown content", async () => {
    const markdownPath = path.join(TEST_MD_DIR, "different_content.md");
    await writeFile(markdownPath, "# Content 1");

    const prerenderPath1 = await prepareMarkdown(markdownPath);
    await cleanupCacheDir();
    await setupCacheDir();
    await writeFile(markdownPath, "# Content 2");
    const prerenderPath2 = await prepareMarkdown(markdownPath);

    const fileName1 = path.basename(prerenderPath1);
    const fileName2 = path.basename(prerenderPath2);

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

    const content = await Bun.file(prerenderPath).text();

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

    const content = await Bun.file(prerenderPath).text();

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
