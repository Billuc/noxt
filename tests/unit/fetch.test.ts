/**
 * Unit tests for src/runtime/fetch.ts
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll } from "bun:test";
import { h, render } from "preact";
import { GlobalWindow } from "happy-dom";
import { useFetchHtml, FetchError } from "../../src/runtime/fetch";

const happyWindow = new GlobalWindow();

beforeAll(() => {
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement = happyWindow.HTMLElement as unknown as typeof HTMLElement;
});

function renderHook<T>(useHook: () => T): { result: { current: T }; cleanup: () => void } {
  const result = { current: undefined as unknown as T };
  const container = document.createElement("div");
  document.body.appendChild(container);

  function TestComponent() {
    result.current = useHook();
    return null;
  }

  render(h(TestComponent), container);

  return {
    result,
    cleanup: () => {
      render(null, container);
      container.remove();
    },
  };
}

describe("FetchError", () => {
  it("should create error with correct properties", () => {
    const err = new FetchError(404, "Not Found");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("FetchError");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not Found");
  });
});

describe("useFetchHtml", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.body.innerHTML = "";
  });

  it("should return the expected interface with initial state", () => {
    const { result, cleanup } = renderHook(() =>
      useFetchHtml({ action: "http://example.com" }),
    );

    const hook = result.current;
    expect(hook).toHaveProperty("fetch");
    expect(hook).toHaveProperty("loading");
    expect(hook).toHaveProperty("error");
    expect(hook).toHaveProperty("data");
    expect(typeof hook.fetch).toBe("function");
    expect(hook.loading).toBe(false);
    expect(hook.error).toBeNull();
    expect(hook.data).toBeNull();

    cleanup();
  });

  it("should set loading to true during fetch", async () => {
    let resolveFetch!: (r: Response) => void;
    globalThis.fetch = () => new Promise((resolve) => { resolveFetch = resolve; });

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({ action: "http://example.com" }),
    );

    const fetchPromise = result.current.fetch();

    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.loading).toBe(true);

    resolveFetch(new Response("ok", { status: 200 }));
    await fetchPromise;

    cleanup();
  });

  it("should fetch HTML and update data on success", async () => {
    globalThis.fetch = () =>
      Promise.resolve(new Response("<div>hello</div>", { status: 200 }));

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({ action: "http://example.com" }),
    );

    const html = await result.current.fetch();

    expect(html).toBe("<div>hello</div>");
    expect(result.current.data).toBe("<div>hello</div>");
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);

    cleanup();
  });

  it("should throw FetchError on non-ok response", async () => {
    globalThis.fetch = () =>
      Promise.resolve(new Response("Not Found", { status: 404, statusText: "Not Found" }));

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({ action: "http://example.com" }),
    );

    try {
      await result.current.fetch();
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(FetchError);
      expect((err as FetchError).status).toBe(404);
    }

    expect(result.current.error).toBeInstanceOf(FetchError);
    expect((result.current.error as FetchError).status).toBe(404);
    expect(result.current.loading).toBe(false);

    cleanup();
  });

  it("should append data to URL query params for GET requests", async () => {
    let requestUrl = "";

    globalThis.fetch = (url: RequestInfo | URL) => {
      requestUrl = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
      return Promise.resolve(new Response("ok", { status: 200 }));
    };

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({
        action: "http://example.com/page",
        data: { q: "test", page: "1" },
      }),
    );

    await result.current.fetch();

    const url = new URL(requestUrl);
    expect(url.searchParams.get("q")).toBe("test");
    expect(url.searchParams.get("page")).toBe("1");

    cleanup();
  });

  it("should send JSON body for POST requests", async () => {
    let requestInit: RequestInit = {};
    globalThis.fetch = (_url: RequestInfo, init?: RequestInit) => {
      requestInit = init ?? {};
      return Promise.resolve(new Response("ok", { status: 200 }));
    };

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({
        action: "http://example.com/page",
        method: "POST",
        data: { name: "test" },
      }),
    );

    await result.current.fetch();

    expect(JSON.parse(requestInit.body as string)).toEqual({ name: "test" });
    const headers = new Headers(requestInit.headers);
    expect(headers.get("Content-Type")).toBe("application/json");

    cleanup();
  });

  it("should auto-insert HTML into target element by selector", async () => {
    const target = document.createElement("div");
    target.id = "test-target";
    document.body.appendChild(target);

    globalThis.fetch = () =>
      Promise.resolve(new Response("<p>injected</p>", { status: 200 }));

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({
        action: "http://example.com",
        target: "#test-target",
        swap: "innerHTML",
      }),
    );

    await result.current.fetch();

    expect(target.innerHTML).toBe("<p>injected</p>");

    cleanup();
  });

  it("should auto-insert HTML into target element by reference", async () => {
    const target = document.createElement("div");

    globalThis.fetch = () =>
      Promise.resolve(new Response("<span>content</span>", { status: 200 }));

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({
        action: "http://example.com",
        target,
        swap: "beforeend",
      }),
    );

    await result.current.fetch();

    expect(target.innerHTML).toBe("<span>content</span>");

    cleanup();
  });

  it("should silently skip auto-insert when target selector does not match", async () => {
    globalThis.fetch = () =>
      Promise.resolve(new Response("<p>lost</p>", { status: 200 }));

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({
        action: "http://example.com",
        target: "#non-existent-element",
      }),
    );

    const html = await result.current.fetch();

    expect(html).toBe("<p>lost</p>");
    expect(result.current.data).toBe("<p>lost</p>");

    cleanup();
  });

  it("should abort previous request when a new one starts", async () => {
    let callCount = 0;
    let firstSignal: AbortSignal | null = null;
    let resolveFirst!: (r: Response) => void;

    globalThis.fetch = (_url: RequestInfo, init?: RequestInit) => {
      callCount++;
      if (callCount === 1) {
        firstSignal = init?.signal ?? null;
        return new Promise((resolve) => { resolveFirst = resolve; });
      }
      return Promise.resolve(new Response("second", { status: 200 }));
    };

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({ action: "http://example.com" }),
    );

    result.current.fetch();

    await new Promise((r) => setTimeout(r, 0));

    await result.current.fetch();

    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.data).toBe("second");

    resolveFirst(new Response("first", { status: 200 }));
    await new Promise((r) => setTimeout(r, 0));

    cleanup();
  });

  it("should handle non-Error thrown values", async () => {
    globalThis.fetch = () => Promise.reject("something went wrong");

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({ action: "http://example.com" }),
    );

    try {
      await result.current.fetch();
    } catch {
      // expected
    }

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error!.message).toBe("something went wrong");

    cleanup();
  });

  it("should not set error on AbortError", async () => {
    globalThis.fetch = () => {
      const err = new Error("Aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    };

    const { result, cleanup } = renderHook(() =>
      useFetchHtml({ action: "http://example.com" }),
    );

    const html = await result.current.fetch();
    expect(html).toBe("");
    expect(result.current.error).toBeNull();

    cleanup();
  });
});
