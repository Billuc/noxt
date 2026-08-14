/**
 * Unit tests for src/core/code_generator.ts
 */
import { generateLinkUtilsCode } from "../../../src/core/code_generation";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = path.resolve(".cache-test-link");

let counter = 0;

async function generateAndLoad(...routeNames: string[]) {
  const code = generateLinkUtilsCode(routeNames);
  const fileName = `utils.${counter++}.ts`;
  const filePath = path.join(CACHE_DIR, fileName);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(filePath, code);
  return import(path.resolve(filePath));
}

async function generateAndLoadWithBase(base: string, ...routeNames: string[]) {
  const code = generateLinkUtilsCode(routeNames, base);
  const fileName = `utils.${counter++}.ts`;
  const filePath = path.join(CACHE_DIR, fileName);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(filePath, code);
  return import(path.resolve(filePath));
}

beforeAll(async () => {
  await rm(CACHE_DIR, { recursive: true, force: true });
});

afterAll(async () => {
  await rm(CACHE_DIR, { recursive: true, force: true });
});

describe("generateLinkUtilsCode", () => {
  it("should generate code with a single route", () => {
    const result = generateLinkUtilsCode(["/"]);
    expect(result).toContain('type RouteId = "/";');
    expect(result).toContain(
      "function link(routeId: RouteId, query?: QueryParams): string",
    );
    expect(result).toContain("if (!query) return url;");
    expect(result).toContain('return url + "?" + params.toString();');
    expect(result).toContain("export { link, type RouteId }");
  });

  it("should generate code with multiple routes", () => {
    const result = generateLinkUtilsCode(["/", "/about", "/contact"]);
    expect(result).toContain('type RouteId = "/" | "/about" | "/contact";');
  });

  it("should generate code with nested route paths", () => {
    const result = generateLinkUtilsCode(["/", "/blog/post"]);
    expect(result).toContain('type RouteId = "/" | "/blog/post";');
  });

  it("should handle routes with hyphens and underscores", () => {
    const result = generateLinkUtilsCode(["/about-us", "/my_profile"]);
    expect(result).toContain('type RouteId = "/about-us" | "/my_profile";');
  });

  it("should handle empty route list", () => {
    const result = generateLinkUtilsCode([]);
    expect(result).toContain("type RouteId = never;");
  });

  it("should set BASE to the provided base", () => {
    const result = generateLinkUtilsCode(["/", "/about"], "/docs");
    expect(result).toContain('export const BASE = "/docs";');
  });

  it("should set BASE to an empty string when no base is provided", () => {
    const result = generateLinkUtilsCode(["/"]);
    expect(result).toContain('export const BASE = "";');
  });
});

describe("generated link function", () => {
  it("should return the route path with no query params", async () => {
    const mod = await generateAndLoad("/", "/about");
    expect(mod.link("/")).toBe("/");
    expect(mod.link("/about")).toBe("/about");
  });

  it("should append query parameters", async () => {
    const mod = await generateAndLoad("/about");
    expect(mod.link("/about", { foo: "bar" })).toBe("/about?foo=bar");
  });

  it("should encode special characters in query params", async () => {
    const mod = await generateAndLoad("/search");
    expect(mod.link("/search", { q: "hello world" })).toBe(
      "/search?q=hello+world",
    );
  });

  it("should handle multiple query parameters", async () => {
    const mod = await generateAndLoad("/products");
    const url = mod.link("/products", { page: "2", sort: "asc" });
    expect(url).toContain("/products?");
    expect(url).toContain("page=2");
    expect(url).toContain("sort=asc");
  });

  it("should convert non-string values to strings", async () => {
    const mod = await generateAndLoad("/items");
    expect(mod.link("/items", { num: 42, flag: true })).toBe(
      "/items?num=42&flag=true",
    );
  });

  it("should return just the path when query is empty object", async () => {
    const mod = await generateAndLoad("/about");
    expect(mod.link("/about", {})).toBe("/about");
  });

  it("should return just the path when query is undefined", async () => {
    const mod = await generateAndLoad("/about");
    expect(mod.link("/about")).toBe("/about");
  });

  it("should prefix route paths with the base", async () => {
    const mod = await generateAndLoadWithBase("/docs", "/", "/about");
    expect(mod.link("/")).toBe("/docs/");
    expect(mod.link("/about")).toBe("/docs/about");
  });

  it("should prefix query params after the base", async () => {
    const mod = await generateAndLoadWithBase("/base", "/search");
    expect(mod.link("/search", { q: "x" })).toBe("/base/search?q=x");
  });
});
