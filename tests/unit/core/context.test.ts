/**
 * Unit tests for src/core/context.ts
 */
import { describe, it, expect } from "bun:test";
import { h } from "preact";
import { useContext } from "preact/hooks";
import type { FunctionComponent } from "preact";
import {
  PageContext,
  PageContextData,
  UtilsContext,
  UtilsContextData,
} from "../../../src/core/context";
import { renderToHtmlString } from "../../../src/core/render";
import { Path } from "../../../src/core/fs";
import type { IslandEntry } from "../../../src/islands";

function fakeIsland(name: string): FunctionComponent<any> {
  const fn = () => null;
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}

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
      { component: B, hash: "hash-b", files: [Path.create("file.js")] },
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
