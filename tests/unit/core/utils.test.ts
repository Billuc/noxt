/**
 * Unit tests for src/core/utils.ts
 */
import {
  getRouteName,
  routeToHtmlPath,
  toPublicPath,
  sanitizePrerendered,
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

describe("sanitizePrerendered", () => {
  it("should add doctype if it starts with <html", () => {
    const input = "<!DOCTYPE html><html><body>Test</body></html>";
    expect(sanitizePrerendered(input)).toBe(input);
  });

  it("should unescape non-html strings", () => {
    const input = "&lt;foo>&amp;bar&lt;/foo>";
    const result = sanitizePrerendered(input);
    expect(result).toEqual("<foo>&bar</foo>");
  });
});
