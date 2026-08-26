/**
 * Unit tests for src/core/url.ts
 */
import { describe, it, expect } from "bun:test";
import {
  buildUrlWithQuery,
  createClientAssetFunction,
  createClientPageFunction,
} from "../../../src/core/url";

describe("buildUrlWithQuery", () => {
  it("should return the url unchanged when query is undefined", () => {
    expect(buildUrlWithQuery("/about")).toBe("/about");
  });

  it("should return the url unchanged when query is empty", () => {
    expect(buildUrlWithQuery("/about", {})).toBe("/about");
  });

  it("should append a single query parameter", () => {
    expect(buildUrlWithQuery("/about", { foo: "bar" })).toBe("/about?foo=bar");
  });

  it("should append multiple query parameters", () => {
    const url = buildUrlWithQuery("/products", { page: 2, sort: "asc" });
    expect(url).toContain("/products?");
    expect(url).toContain("page=2");
    expect(url).toContain("sort=asc");
  });

  it("should encode special characters in query parameters", () => {
    expect(buildUrlWithQuery("/search", { q: "hello world" })).toBe(
      "/search?q=hello+world",
    );
  });
});

describe("createClientPageFunction", () => {
  it("should prefix pages with the base", () => {
    const page = createClientPageFunction("/docs");
    expect(page("/about")).toBe("/docs/about");
  });

  it("should prefix pages and append query parameters after the base", () => {
    const page = createClientPageFunction("/base");
    expect(page("/search", { q: "x" })).toBe("/base/search?q=x");
  });

  it("should work without a base prefix", () => {
    const page = createClientPageFunction("");
    expect(page("/about", { foo: "bar" })).toBe("/about?foo=bar");
  });
});

describe("createClientAssetFunction", () => {
  it("should prefix assets with the base", () => {
    const asset = createClientAssetFunction("/base");
    expect(asset("/img.png")).toBe("/base/img.png");
  });

  it("should work without a base prefix", () => {
    const asset = createClientAssetFunction("");
    expect(asset("/img.png")).toBe("/img.png");
  });
});
