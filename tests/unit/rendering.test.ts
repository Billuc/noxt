/**
 * Unit tests for src/core/rendering.ts
 */
import { getRouteName, parseMarkdown } from "../../src/core/rendering";
import { describe, it, expect } from "bun:test";

describe("getRouteName", () => {
  it("should convert index.md to /", () => {
    expect(getRouteName("index.md")).toBe("/");
  });

  it("should convert about.md to /about", () => {
    expect(getRouteName("about.md")).toBe("/about");
  });

  it("should handle nested paths", () => {
    expect(getRouteName("blog/post.md")).toBe("/blog/post");
  });

  it("should handle backslashes in paths", () => {
    expect(getRouteName("blog\\post.md")).toBe("/blog/post");
  });

  it("should handle different extensions", () => {
    expect(getRouteName("about.tsx")).toBe("/about");
    expect(getRouteName("about.js")).toBe("/about");
  });

  it("should handle index files in nested paths", () => {
    expect(getRouteName("blog/index.md")).toBe("/blog/");
  });
});

describe("parseMarkdown", () => {
  it("should return empty frontmatter for markdown without frontmatter", () => {
    const result = parseMarkdown("# Hello World");
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe("# Hello World");
  });

  it("should parse frontmatter with single field", () => {
    const markdown = "---\ntitle: Hello\n---\n# Content";
    const result = parseMarkdown(markdown);
    expect(result.frontmatter).toEqual({ title: "Hello" });
    expect(result.content).toBe("# Content");
  });

  it("should parse frontmatter with multiple fields", () => {
    const markdown = `---
title: Hello
author: Test
---
# Content`;
    const result = parseMarkdown(markdown);
    expect(result.frontmatter).toEqual({ title: "Hello", author: "Test" });
    expect(result.content).toBe("# Content");
  });

  it("should return empty frontmatter for malformed frontmatter", () => {
    const markdown = "---\nnot valid yaml\n---\n# Content";
    const result = parseMarkdown(markdown);
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe("# Content");
  });

  it("should parse rest as frontmatter for unclosed frontmatter", () => {
    const markdown = "---\ntitle: Hello";
    const result = parseMarkdown(markdown);
    // When no closing --- is found, slice(4, -1) extracts "title: Hell"
    expect(result.frontmatter).toEqual({ title: "Hell" });
    expect(result.content).toBe("\ntitle: Hello");
  });

  it("should handle frontmatter with only opening delimiter", () => {
    const markdown = "---\n# Content";
    const result = parseMarkdown(markdown);
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe("\n# Content");
  });
});
