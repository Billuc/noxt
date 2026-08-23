/**
 * Unit tests for src/markdown/render.ts
 */
import { renderMarkdownToHtml } from "../../../src/markdown/render";
import { describe, it, expect } from "bun:test";

describe("renderMarkdownToHtml", () => {
  it("should render markdown content with default layout", async () => {
    const result = await renderMarkdownToHtml({
      frontmatter: {},
      content: "# Hello",
    });
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("<html>");
    expect(result).toContain("<head></head>");
    expect(result).toContain("<body>");
    expect(result).toContain("<h1>Hello</h1>");
  });

  it("should render markdown with frontmatter", async () => {
    const result = await renderMarkdownToHtml({
      frontmatter: { title: "Test Page" },
      content: "# Title",
    });
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("<h1>Title</h1>");
  });

  it("should handle empty markdown content", async () => {
    const result = await renderMarkdownToHtml({ frontmatter: {}, content: "" });
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("<body></body>");
  });

  it("should render paragraphs", async () => {
    const result = await renderMarkdownToHtml({
      frontmatter: {},
      content: "Hello\n\nWorld",
    });
    expect(result).toContain("<p>Hello</p>");
    expect(result).toContain("<p>World</p>");
  });

  it("should render lists", async () => {
    const result = await renderMarkdownToHtml({
      frontmatter: {},
      content: "- Item 1\n- Item 2",
    });
    expect(result).toContain("<ul>");
    expect(result).toContain("<li>Item 1</li>");
    expect(result).toContain("<li>Item 2</li>");
  });

  it("should pass base parameter", async () => {
    const result = await renderMarkdownToHtml(
      { frontmatter: {}, content: "# Test" },
      "/base",
    );
    expect(result).toContain("<!DOCTYPE html>");
  });
});
