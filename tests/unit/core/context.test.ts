/**
 * Unit tests for src/core/context.ts
 */
import { describe, it, expect, mock } from "bun:test";
import { h } from "preact";
import { useContext } from "preact/hooks";
import type { FunctionComponent } from "preact";
import * as s from "superstruct";
import {
  PageContext,
  PageContextData,
  UtilsContext,
  UtilsContextData,
} from "../../../src/core/context";
import { renderToHtmlString } from "../../../src/core/render";
import { Path } from "../../../src/core/fs";
import type { IslandEntry } from "../../../src/islands";
import { makeApiFn } from "../../../src/runtime/api";
import type { PageFunction } from "../../../src/core/types";
import type { AssetFunction } from "../../../src/assets/types";

function fakeIsland(name: string): FunctionComponent<any> {
  const fn = () => null;
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}

const testApiDefs = {
  "/api/test": {
    GET: {
      input: s.object({ q: s.string() }),
      output: s.object({ ok: s.boolean() }),
    },
  },
  "/r": {
    GET: {
      input: s.object({ a: s.string() }),
      output: s.object({}),
    },
  },
} as const;
type TestApi = typeof testApiDefs;

type TestPage = "/about" | "/contact";
type TestAsset = "/img.png" | "/style.css";

const testPage: PageFunction<TestPage> = (pageId) => `/p${pageId}`;
const testAsset: AssetFunction<TestAsset> = (assetId) => `/a${assetId}`;

describe("PageContextData", () => {
  it("should default base to an empty string", () => {
    const data = PageContextData.from({});
    expect(data.base).toBe("");
  });

  it("should keep the provided base", () => {
    const data = PageContextData.from({ base: "/docs" });
    expect(data.base).toBe("/docs");
  });

  it("should build an island map from the island entries", () => {
    const A = fakeIsland("A");
    const B = fakeIsland("B");
    const entries: IslandEntry[] = [
      { component: A, hash: "hash-a", files: [] },
      { component: B, hash: "hash-b", files: [Path.fromAbsolute("file.js")] },
    ];

    const data = PageContextData.from({ islands: entries });

    expect(data.islandMap.size).toBe(2);
    expect(data.islandMap.get(A)).toEqual(entries[0]);
    expect(data.islandMap.get(B)).toEqual(entries[1]);
  });

  it("should produce an empty island map when no islands are provided", () => {
    const data = PageContextData.from({});
    expect(data.islandMap.size).toBe(0);
  });
});

describe("UtilsContextData", () => {
  it("should use the provided page and asset functions", () => {
    const data = UtilsContextData.from({
      page: (pageId) => `/p${pageId}`,
      asset: (assetId) => `/a${assetId}`,
    });

    expect(data.page("/about")).toBe("/p/about");
    expect(data.asset("/img.png")).toBe("/a/img.png");
  });

  it("should fall back to a throwing page function when not provided", () => {
    const data = UtilsContextData.from({});
    expect(() => data.page("/about")).toThrow(
      "No page function has been provided",
    );
    expect(() => data.page("/about")).toThrow("generateRouteUtils");
  });

  it("should fall back to a throwing asset function when not provided", () => {
    const data = UtilsContextData.from({});
    expect(() => data.asset("/img.png")).toThrow(
      "No asset function has been provided",
    );
    expect(() => data.asset("/img.png")).toThrow("generateAssetUtils");
  });
});

describe("UtilsContextData api", () => {
  it("should expose an api function by default", () => {
    const data = UtilsContextData.from({});
    expect(typeof data.api).toBe("function");
  });

  it("should prefix api calls with the given base", async () => {
    const data = new UtilsContextData<TestApi, TestPage, TestAsset>(
      makeApiFn<TestApi>("http://localhost:3000/base"),
      testPage,
      testAsset,
    );
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }))),
    );

    const result = await data.api("/api/test", "GET", fetcher)({ q: "x" });

    expect(result).toEqual({ ok: true });
    expect(fetcher.mock.lastCall?.[0].url).toContain("/base/api/test?q=x");
  });

  it("should build the api function from the base in from()", async () => {
    const data = UtilsContextData.from<TestPage, TestAsset>({
      base: "http://localhost:3000/docs",
      page: testPage,
      asset: testAsset,
    });
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response(JSON.stringify({}))),
    );

    await data.api("/r", "GET", fetcher)({ a: "b" });

    expect(fetcher.mock.lastCall?.[0].url).toContain("/docs/r?a=b");
  });
});

describe("default context values", () => {
  it("PageContext should default to an empty base and an empty island map", async () => {
    const Component = () => {
      const { base, islandMap } = useContext(PageContext);
      return h("div", {}, `[${base}] [${islandMap.size}]`);
    };

    const html = await renderToHtmlString(h(Component, {}));
    expect(html).toContain("[] [0]");
  });

  it("UtilsContext should default to throwing page and asset functions", async () => {
    const Page = () => h("div", {}, useContext(UtilsContext).page("/about"));
    const Asset = () =>
      h("div", {}, useContext(UtilsContext).asset("/img.png"));

    await expect(renderToHtmlString(h(Page, {}))).rejects.toThrow(
      "No page function has been provided",
    );
    await expect(renderToHtmlString(h(Asset, {}))).rejects.toThrow(
      "No asset function has been provided",
    );
  });
});
