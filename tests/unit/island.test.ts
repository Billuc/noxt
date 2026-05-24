/**
 * Unit tests for src/core/island.ts
 */
import {
  defineIsland,
  getImportPath,
  getHash,
  generateScriptForIsland,
} from "../../src/core/island";
import { describe, it, expect } from "bun:test";
import { h } from "preact";
import path from "node:path";

describe("defineIsland", () => {
  it("should attach import path to component", () => {
    const Component = () => h("div", {}, "test");
    const island = defineIsland(Component, "./components/MyComponent");
    expect(getImportPath(island)).toBe("./components/MyComponent");
  });
});

describe("getHash", () => {
  it("should return consistent hash for same import path", () => {
    const Component = () => h("div", {}, "test");
    const island = defineIsland(Component, "./components/Test");
    const hash1 = getHash(island);
    const hash2 = getHash(island);
    expect(hash1).toBe(hash2);
  });

  it("should return different hash for different import paths", () => {
    const Component1 = () => h("div", {}, "test1");
    const Component2 = () => h("div", {}, "test2");
    const island1 = defineIsland(Component1, "./components/A");
    const island2 = defineIsland(Component2, "./components/B");
    expect(getHash(island1)).not.toBe(getHash(island2));
  });
});

describe("generateScriptForIsland", () => {
  it("should generate script with correct import path and hash", () => {
    const Component = () => h("div", {}, "test");
    const island = defineIsland(Component, "./components/MyIsland");
    const script = generateScriptForIsland(island);
    const expectedHash = getHash(island);
    expect(script).toEqualIgnoringWhitespace(
      `
      import { renderComponent } from ${JSON.stringify(path.join(__dirname, "../..", "src/runtime", "render.ts"))};
      import Island from "./components/MyIsland";
      renderComponent(Island, "${expectedHash}");
    `,
    );
  });
});
