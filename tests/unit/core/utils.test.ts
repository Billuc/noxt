/**
 * Unit tests for src/core/utils.ts
 */
import {
  getRouteName,
  routeToHtmlPath,
  toPublicPath,
  sanitizeHtml,
} from "../../../src/core/utils";
import { describe, it, expect } from "bun:test";
import path from "node:path";

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
    expect(getRouteName("blog/index.md")).toBe("/blog");
  });

  it("should handle base parameter", () => {
    expect(getRouteName("about.md", "/base")).toBe("/base/about");
  });
});

describe("routeToHtmlPath", () => {
  it("should convert root route to index.html", () => {
    expect(routeToHtmlPath("/")).toBe("index.html");
  });

  it("should convert /about to about/index.html", () => {
    expect(routeToHtmlPath("/about")).toBe(path.join("about", "index.html"));
  });

  it("should convert /blog/post to blog/post/index.html", () => {
    expect(routeToHtmlPath("/blog/post")).toBe(
      path.join("blog", "post", "index.html"),
    );
  });

  it("should handle trailing slash", () => {
    expect(routeToHtmlPath("/blog/")).toBe(path.join("blog", "index.html"));
  });

  it("should handle deep nested routes", () => {
    expect(routeToHtmlPath("/a/b/c")).toBe(
      path.join("a", "b", "c", "index.html"),
    );
  });
});

describe("toPublicPath", () => {
  it("should convert path with backslashes", () => {
    expect(toPublicPath("assets\\image.png", "/")).toBe("/assets/image.png");
  });

  it("should trim leading and trailing slashes", () => {
    expect(toPublicPath("/assets/image.png", "/base")).toBe(
      "/base/assets/image.png",
    );
  });

  it("should handle empty base", () => {
    expect(toPublicPath("image.png", "")).toBe("/image.png");
  });

  it("should handle slashes in route and base", () => {
    expect(toPublicPath("/image.png", "/")).toBe("/image.png");
  });
});

describe("sanitizeHtml", () => {
  it("should return html as-is if it starts with <html", () => {
    const input = "<html><body>Test</body></html>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("should wrap body content in html tags", () => {
    const input = "<body><h1>Test</h1></body>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<html>");
    expect(result).toContain("<head></head>");
    expect(result).toContain("<body><h1>Test</h1></body>");
  });

  it("should wrap fragment in html and body tags", () => {
    const input = "<h1>Test</h1>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<html>");
    expect(result).toContain("<head></head>");
    expect(result).toContain("<body><h1>Test</h1></body>");
  });
});
