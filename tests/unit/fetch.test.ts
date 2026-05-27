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
import { useFetch, FetchError } from "../../src/runtime/fetch";

const happyWindow = new GlobalWindow();

beforeAll(() => {
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement =
    happyWindow.HTMLElement as unknown as typeof HTMLElement;
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
});

function renderHook<T>(useHook: () => T): {
  result: { current: T };
  cleanup: () => void;
} {
  const result = { current: undefined as unknown as T };
  const container = document.createElement("div");
  document.body.appendChild(container);

  function TestComponent() {
    result.current = useHook();
    return null;
  }

  render(h(TestComponent, {}), container);

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

describe("useFetch", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.body.innerHTML = "";
  });

  describe("interface", () => {
    it("should return the expected shape", () => {
      globalThis.fetch = () => new Promise(() => {});

      const { result, cleanup } = renderHook(() =>
        useFetch("http://example.com"),
      );

      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refresh");
      expect(typeof result.current.refresh).toBe("function");

      cleanup();
    });

    it("should start loading when no initial data", () => {
      const { result, cleanup } = renderHook(() =>
        useFetch("http://example.com"),
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      cleanup();
    });

    it("should not start loading when initial data provided", () => {
      const { result, cleanup } = renderHook(() =>
        useFetch("http://example.com", { initial: { name: "test" } }),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({ name: "test" });
      expect(result.current.error).toBeNull();

      cleanup();
    });
  });

  describe("refresh()", () => {
    it("should fetch data and return it", async () => {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response(JSON.stringify({ value: 42 }), { status: 200 }),
        );

      const { result, cleanup } = renderHook(() =>
        useFetch<{ value: number }>("http://example.com", {
          initial: { value: 41 },
        }),
      );

      expect(result.current.data).toEqual({ value: 41 });

      const data = await result.current.refresh();

      expect(data).toEqual({ value: 42 });
      expect(result.current.data).toEqual({ value: 42 });
      expect(result.current.error).toBeNull();

      cleanup();
    });

    it("should throw FetchError on non-ok response", async () => {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response("Not Found", { status: 404, statusText: "Not Found" }),
        );

      const { result, cleanup } = renderHook(() =>
        useFetch("http://example.com", { initial: {} as any }),
      );

      try {
        await result.current.refresh();
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(FetchError);
        expect((err as FetchError).status).toBe(404);
      }

      expect(result.current.error).toBeInstanceOf(FetchError);
      expect((result.current.error as FetchError).status).toBe(404);

      cleanup();
    });

    it("should serialize body to query params for GET", async () => {
      let requestUrl = "";
      globalThis.fetch = (url: RequestInfo | URL) => {
        requestUrl =
          typeof url === "string"
            ? url
            : url instanceof URL
              ? url.href
              : url.url;
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      };

      const { result, cleanup } = renderHook(() =>
        useFetch("http://example.com/page", {
          initial: {} as any,
          body: { q: "test", page: "1" },
        }),
      );

      await result.current.refresh();

      const url = new URL(requestUrl);
      expect(url.searchParams.get("q")).toBe("test");
      expect(url.searchParams.get("page")).toBe("1");

      cleanup();
    });

    it("should send JSON body for POST", async () => {
      let requestInit: RequestInit = {};
      globalThis.fetch = (_url: RequestInfo, init?: RequestInit) => {
        requestInit = init ?? {};
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      };

      const { result, cleanup } = renderHook(() =>
        useFetch("http://example.com/page", {
          initial: {} as any,
          method: "POST",
          body: { name: "test" },
        }),
      );

      await result.current.refresh();

      expect(JSON.parse(requestInit.body as string)).toEqual({ name: "test" });
      expect(new Headers(requestInit.headers).get("Content-Type")).toBe(
        "application/json",
      );

      cleanup();
    });

    it("should abort previous request when called again", async () => {
      let callCount = 0;
      let firstSignal: AbortSignal | null = null;
      let resolveFirst!: (r: Response) => void;

      globalThis.fetch = (_url: RequestInfo, init?: RequestInit) => {
        callCount++;
        if (callCount === 1) {
          firstSignal = init?.signal ?? null;
          return new Promise((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve(
          new Response(JSON.stringify({ round: 2 }), { status: 200 }),
        );
      };

      const { result, cleanup } = renderHook(() =>
        useFetch("http://example.com", { initial: {} as any }),
      );

      result.current.refresh();
      await new Promise((r) => setTimeout(r, 0));
      await result.current.refresh();

      expect(firstSignal).not.toBeNull();
      expect(firstSignal!.aborted).toBe(true);
      expect(result.current.data).toEqual({ round: 2 });

      resolveFirst(new Response(JSON.stringify({ round: 1 }), { status: 200 }));
      await new Promise((r) => setTimeout(r, 0));

      cleanup();
    });

    it("should handle non-Error thrown values", async () => {
      globalThis.fetch = () => Promise.reject("something went wrong");

      const { result, cleanup } = renderHook(() =>
        useFetch("http://example.com", { initial: {} as any }),
      );

      try {
        await result.current.refresh();
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
        useFetch("http://example.com", { initial: {} as any }),
      );

      const data = await result.current.refresh();
      expect(data).toBeNull();
      expect(result.current.error).toBeNull();

      cleanup();
    });

    it("should update data on successive calls", async () => {
      let callIdx = 0;
      globalThis.fetch = () => {
        callIdx++;
        return Promise.resolve(
          new Response(JSON.stringify({ count: callIdx }), { status: 200 }),
        );
      };

      const { result, cleanup } = renderHook(() =>
        useFetch<{ count: number }>("http://example.com", {
          initial: {} as any,
        }),
      );

      await result.current.refresh();
      expect(result.current.data).toEqual({ count: 1 });

      await result.current.refresh();
      expect(result.current.data).toEqual({ count: 2 });

      cleanup();
    });
  });

  describe("auto-fetch on mount", () => {
    it("should call fetch when no initial data", () => {
      let fetchCalled = false;
      globalThis.fetch = () => {
        fetchCalled = true;
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      };

      const { cleanup } = renderHook(() => useFetch("http://example.com"));

      expect(fetchCalled).toBe(true);

      cleanup();
    });

    it("should not call fetch when initial data provided", () => {
      let fetchCalled = false;
      globalThis.fetch = () => {
        fetchCalled = true;
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      };

      const { cleanup } = renderHook(() =>
        useFetch("http://example.com", { initial: { cached: true } }),
      );

      expect(fetchCalled).toBe(false);

      cleanup();
    });

    it("should abort in-flight request on unmount", () => {
      let signal: AbortSignal | null = null;

      globalThis.fetch = (_url: RequestInfo, init?: RequestInit) => {
        signal = init?.signal ?? null;
        return new Promise(() => {});
      };

      const { cleanup } = renderHook(() => useFetch("http://example.com"));

      cleanup();

      expect(signal).not.toBeNull();
      expect(signal!.aborted).toBe(true);
    });
  });
});
