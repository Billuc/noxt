/**
 * Unit tests for src/core/url.ts
 */
import { describe, it, expect } from "bun:test";
import * as devalue from "devalue";
import {
  buildUrlWithQuery,
  createClientAssetFunction,
  createClientPageFunction,
  toSearchParam,
  toBody,
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

describe("toSearchParam", () => {
  it("should encode string/number/boolean values", () => {
    const params = toSearchParam({ name: "John", age: 25, active: true });
    expect(params).toBeInstanceOf(URLSearchParams);
    expect(params.get("name")).toBe("John");
    expect(params.get("age")).toBe("25");
    expect(params.get("active")).toBe("true");
  });

  it("should flatten arrays", () => {
    expect(
      toSearchParam({ tags: ["a", "b"], scores: [1, 2] }).getAll("tags"),
    ).toEqual(["a", "b"]);
    expect(
      toSearchParam({ tags: ["a", "b"], scores: [1, 2] }).getAll("scores"),
    ).toEqual(["1", "2"]);
  });

  it("should map undefined to empty arrays", () => {
    const params = toSearchParam({ a: undefined });
    expect(params.get("a")).toBeNull();
    expect(params.toString()).toBe("");
  });

  it("should omit unsupported values but keep supported ones", () => {
    const params = toSearchParam({ q: "x", skip: undefined });
    expect(params.get("q")).toBe("x");
    expect(params.get("skip")).toBeNull();
  });
});

describe("toBody", () => {
  it("should serialize via devalue (not JSON)", () => {
    const value = { name: "John", age: 25 };
    expect(toBody(value)).toBe(devalue.stringify(value));
    expect(devalue.parse(toBody(value)!)).toEqual(value);
  });

  it("should support Date values", () => {
    const at = new Date("2023-01-01T00:00:00.000Z");
    const raw = toBody({ at })!;
    expect(devalue.parse(raw)).toEqual({ at });
  });

  it("should round-trip undefined via devalue encoding", () => {
    const raw = toBody(undefined)!;
    expect(typeof raw).toBe("string");
    expect(devalue.parse(raw)).toBeUndefined();
  });
});
