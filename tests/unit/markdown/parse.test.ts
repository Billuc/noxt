/**
 * Unit tests for src/markdown/parse.ts
 */
import { parseMarkdown } from "../../../src/markdown/parse";
import { describe, it, expect } from "bun:test";

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

  it("should parse rest as markdown for unclosed frontmatter", () => {
    const markdown = "---\ntitle: Hello";
    const result = parseMarkdown(markdown);
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe("---\ntitle: Hello");
  });

  it("should handle windows line endings", () => {
    const markdown = "---\r\ntitle: Hello\r\n---\r\n# Content";
    const result = parseMarkdown(markdown);
    expect(result.frontmatter).toEqual({ title: "Hello" });
    expect(result.content).toBe("# Content");
  });

  it("should handle complex yaml frontmatter", () => {
    const markdown = `---
title: My Page
date: 2024-01-01
tags:
  - tag1
  - tag2
---
# Content`;
    const result = parseMarkdown(markdown);
    expect(result.frontmatter).toEqual({ 
      title: "My Page", 
      date: "2024-01-01",
      tags: ["tag1", "tag2"]
    });
    expect(result.content).toBe("# Content");
  });
});
