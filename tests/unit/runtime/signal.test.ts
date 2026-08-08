import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
} from "bun:test";
import { h, render } from "preact";
import { GlobalWindow } from "happy-dom";
import { sharedSignal } from "../../../src/runtime/signal";
import type { Signal } from "@preact/signals-core";

const happyWindow = new GlobalWindow();

beforeAll(() => {
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement =
    happyWindow.HTMLElement as unknown as typeof HTMLElement;
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
});

beforeEach(() => {
  (happyWindow as any).__NOXT_SIGNALS__ = undefined;
  document.body.innerHTML = "";
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("sharedSignal", () => {
  it("should create a signal with the given initial value", () => {
    const count = sharedSignal("count", 0);
    expect(count.value).toBe(0);
  });

  it("should return the same signal for the same key", () => {
    const a = sharedSignal("shared", 42);
    const b = sharedSignal("shared", 42);
    expect(a).toBe(b);
    a.value = 100;
    expect(b.value).toBe(100);
  });

  it("should allow reading and writing via .value", () => {
    const s = sharedSignal("rw", "hello");
    expect(s.value).toBe("hello");
    s.value = "world";
    expect(s.value).toBe("world");
  });

  it("should support typed signals", () => {
    const s = sharedSignal<number>("typed", 0);
    s.value = 5;
    expect(s.value).toBe(5);
  });
});

describe("cross-island sharing", () => {
  it("should share state between independently rendered component trees", async () => {
    const counter = sharedSignal("cross-island-counter", 5);

    const containerA = document.createElement("div");
    const containerB = document.createElement("div");
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);

    function IslandA() {
      return h("p", { id: "display" }, `count: ${counter.value}`);
    }

    function IslandB() {
      return h(
        "button",
        {
          id: "increment",
          onClick: () => {
            counter.value++;
          },
        },
        "+",
      );
    }

    render(h(IslandA, {}), containerA);
    render(h(IslandB, {}), containerB);

    const display = document.getElementById("display")!;
    expect(display.textContent).toBe("count: 5");

    document.getElementById("increment")!.click();
    await Bun.sleep(0);
    expect(display.textContent).toBe("count: 6");

    counter.value = 10;
    await Bun.sleep(0);
    expect(display.textContent).toBe("count: 10");

    containerA.remove();
    containerB.remove();
  });

  it("should work when islands import via separate calls", async () => {
    function getCounter() {
      return sharedSignal("separate-calls", 0);
    }

    const containerA = document.createElement("div");
    const containerB = document.createElement("div");
    document.body.appendChild(containerA);
    document.body.appendChild(containerB);

    function IslandA() {
      return h("span", { id: "val" }, `v: ${getCounter().value}`);
    }

    function IslandB() {
      return h(
        "button",
        {
          id: "inc",
          onClick: () => {
            getCounter().value++;
          },
        },
        "+",
      );
    }

    render(h(IslandA, {}), containerA);
    render(h(IslandB, {}), containerB);

    expect(document.getElementById("val")!.textContent).toBe("v: 0");

    document.getElementById("inc")!.click();
    await Bun.sleep(0);
    expect(document.getElementById("val")!.textContent).toBe("v: 1");

    containerA.remove();
    containerB.remove();
  });
});

describe("global registry", () => {
  it("should share signals via window.__NOXT_SIGNALS__", () => {
    const s1 = sharedSignal("global-key", "first");
    const s2 = sharedSignal("global-key", "first");

    expect(s1).toBe(s2);

    const store = (happyWindow as any).__NOXT_SIGNALS__ as Map<string, Signal>;
    expect(store.get("global-key")).toBe(s1);
  });

  it("should survive window being undefined (SSR path)", () => {
    const origWindow = globalThis.window;
    (globalThis as any).window = undefined;

    try {
      const s = sharedSignal("ssr", "server");
      expect(s.value).toBe("server");
      s.value = "updated";
      expect(s.value).toBe("updated");

      const s2 = sharedSignal("ssr", "server");
      expect(s2).toBe(s);
    } finally {
      (globalThis as any).window = origWindow;
    }
  });
});
