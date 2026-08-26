/**
 * Unit tests for src/runtime/render.ts
 */
import { Window } from "happy-dom";
import * as devalue from "devalue";

const window = new Window();

// happy-dom v20 doesn't expose Error globals on the Window; patch them
for (const ctor of [
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]) {
  (window as any)[ctor] = globalThis[ctor as keyof typeof globalThis];
}

Object.assign(globalThis, {
  document: window.document,
  window: window,
  HTMLElement: window.HTMLElement,
  customElements: window.customElements,
});

import { renderIsland } from "../../../src/runtime/island";
import { UtilsContext } from "../../../src/core/context";
import { describe, it, expect, afterEach } from "bun:test";
import { h } from "preact";
import { useContext } from "preact/hooks";

describe("renderIsland", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should render component into elements matching the hash selector", () => {
    const TestComponent = () => h("div", { id: "test" }, "Hello");
    const hash = "abc123";

    const el = document.createElement("div");
    el.setAttribute("data-island", hash);
    el.setAttribute("data-props", "[{}]");
    document.body.appendChild(el);

    renderIsland(TestComponent, hash, "");

    expect(el.querySelector("#test")).not.toBeNull();
  });

  it("should pass props from data-props attribute to component", () => {
    const TestComponent = (props: { name: string }) =>
      h("span", {}, props.name);
    const hash = "def456";

    const el = document.createElement("div");
    el.setAttribute("data-island", hash);
    el.setAttribute("data-props", devalue.stringify({ name: "World" }));
    document.body.appendChild(el);

    renderIsland(TestComponent, hash, "");

    expect(el.textContent).toBe("World");
  });

  it("should handle missing data-props attribute", () => {
    const TestComponent = () => h("div", {}, "No props");
    const hash = "ghi789";

    const el = document.createElement("div");
    el.setAttribute("data-island", hash);
    document.body.appendChild(el);

    renderIsland(TestComponent, hash, "");

    expect(el.textContent).toBe("No props");
  });

  it("should do nothing when no elements match the hash", () => {
    const TestComponent = () => h("div", {}, "Should not render");

    renderIsland(TestComponent, "no-match", "");

    expect(document.body.innerHTML).toBe("");
  });

  it("should render into multiple matching elements with different props", () => {
    const TestComponent = (props: { index: number }) =>
      h("span", {}, `Item ${props.index}`);
    const hash = "multi";

    const el1 = document.createElement("div");
    el1.setAttribute("data-island", hash);
    el1.setAttribute("data-props", devalue.stringify({ index: 1 }));
    document.body.appendChild(el1);

    const el2 = document.createElement("div");
    el2.setAttribute("data-island", hash);
    el2.setAttribute("data-props", devalue.stringify({ index: 2 }));
    document.body.appendChild(el2);

    renderIsland(TestComponent, hash, "");

    expect(el1.textContent).toBe("Item 1");
    expect(el2.textContent).toBe("Item 2");
  });

  it("should parse complex props correctly", () => {
    const TestComponent = (props: { items: string[]; count: number }) =>
      h("p", {}, `Count: ${props.count}, Items: ${props.items.join(",")}`);
    const hash = "complex";

    const el = document.createElement("div");
    el.setAttribute("data-island", hash);
    el.setAttribute(
      "data-props",
      devalue.stringify({ items: ["a", "b", "c"], count: 3 }),
    );
    document.body.appendChild(el);

    renderIsland(TestComponent, hash);

    expect(el.textContent).toBe("Count: 3, Items: a,b,c");
  });

  it("should expose page and asset utils prefixed with the base", () => {
    const TestComponent = () => {
      const { page, asset } = useContext(UtilsContext);
      return h("div", {}, `${page("/about", { q: 1 })} ${asset("/img.png")}`);
    };
    const hash = "utils-base";

    const el = document.createElement("div");
    el.setAttribute("data-island", hash);
    document.body.appendChild(el);

    renderIsland(TestComponent, hash, "/base");

    expect(el.textContent).toBe("/base/about?q=1 /base/img.png");
  });

  it("should default the base to an empty string when not provided", () => {
    const TestComponent = () => {
      const { page } = useContext(UtilsContext);
      return h("div", {}, page("/about"));
    };
    const hash = "utils-no-base";

    const el = document.createElement("div");
    el.setAttribute("data-island", hash);
    document.body.appendChild(el);

    renderIsland(TestComponent, hash);

    expect(el.textContent).toBe("/about");
  });

  it("should share the same utils instance across hydrated elements", () => {
    const seen: any[] = [];
    const TestComponent = () => {
      seen.push(useContext(UtilsContext));
      return h("span", null);
    };
    const hash = "utils-shared";

    for (const index of [1, 2]) {
      const el = document.createElement("div");
      el.setAttribute("data-island", hash);
      el.setAttribute("data-props", devalue.stringify({ index }));
      document.body.appendChild(el);
    }

    renderIsland(TestComponent, hash, "/base");

    expect(seen.length).toBe(2);
    expect(seen[0]).toBe(seen[1]);
  });
});
