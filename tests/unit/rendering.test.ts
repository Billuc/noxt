/**
 * Unit tests for src/core/rendering.ts
 */
import {
  getRouteName,
  parseMarkdown,
  renderPageToHtml,
  renderMarkdownToHtml,
} from "../../src/core/rendering";
import { h, type ComponentType } from "preact";
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

  it("should parse rest as markdown for unclosed frontmatter", () => {
    const markdown = "---\ntitle: Hello";
    const result = parseMarkdown(markdown);
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe("---\ntitle: Hello");
  });
});

describe("renderPageToHtml", () => {
  it("should render a simple component to full HTML with DOCTYPE", async () => {
    const Component = () => h("h1", {}, "Hello World");
    const result = await renderPageToHtml(Component);
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <head></head>
          <body><h1>Hello World</h1></body>
        </html>`,
    );
  });

  it("should render nested components", async () => {
    const Child = () => h("span", {}, "Child");
    const Parent = () => h("div", {}, [h("h1", {}, "Parent"), h(Child, {})]);
    const result = await renderPageToHtml(Parent);
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <head></head>
          <body><div><h1>Parent</h1><span>Child</span></div></body>
        </html>`,
    );
  });

  it("should render a component that returns null", async () => {
    const Component = () => null;
    const result = await renderPageToHtml(Component);
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <head></head>
          <body></body>
        </html>`,
    );
  });
});

describe("renderMarkdownToHtml", () => {
  it("should render markdown content with a layout that returns html/body", async () => {
    const Layout: ComponentType<Record<string, any>> = ({ children }) =>
      h("html", {}, [h("body", {}, children)]);
    const result = await renderMarkdownToHtml(
      { frontmatter: { title: "Test" }, content: "# Hello" },
      Layout,
    );
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <body><h1>Hello</h1></body>
        </html>`,
    );
  });

  it("should pass frontmatter as props to layout component", async () => {
    const Layout: ComponentType<Record<string, any>> = (props) =>
      h("html", {}, [
        h("head", {}, h("title", {}, props.title)),
        h("body", {}, props.children),
      ]);
    const result = await renderMarkdownToHtml(
      { frontmatter: { title: "My Page" }, content: "Content" },
      Layout,
    );
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <head><title>My Page</title></head>
          <body><p>Content</p></body>
        </html>`,
    );
  });

  it("should handle empty markdown content", async () => {
    const Layout: ComponentType<Record<string, any>> = ({ children }) =>
      h("html", {}, [h("body", {}, children)]);
    const result = await renderMarkdownToHtml(
      { frontmatter: {}, content: "" },
      Layout,
    );
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <body></body>
        </html>`,
    );
  });

  it("should replace the markdown placeholder with rendered HTML", async () => {
    const Layout: ComponentType<Record<string, any>> = ({ children }) =>
      h("html", {}, [h("body", {}, children)]);
    const result = await renderMarkdownToHtml(
      { frontmatter: {}, content: "# Clean" },
      Layout,
    );
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <body><h1>Clean</h1></body>
        </html>`,
    );
  });

  it("should wrap markdown in html/body when layout output has no wrapping tags", async () => {
    const Layout: ComponentType<Record<string, any>> = ({ children }) =>
      h("div", {}, children);
    const result = await renderMarkdownToHtml(
      { frontmatter: {}, content: "# Hello" },
      Layout,
    );
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <head></head>
          <body><div><h1>Hello</h1></div></body>
        </html>`,
    );
  });
});
