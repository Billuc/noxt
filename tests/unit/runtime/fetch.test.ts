/**
 * Copyright 2026 Luc BILLAUD
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 **/

import {
  describe,
  it,
  expect,
  beforeAll,
  afterEach,
  beforeEach,
  mock,
} from "bun:test";
import { renderHook, waitFor } from "@testing-library/preact";
import { GlobalWindow } from "happy-dom";
import {
  requestFrom,
  useAsync,
  fetchJson,
  useFetchJson,
  type FetchRequestInit,
  type UseDataFetchReturn,
} from "../../../src/runtime/fetch";
import { sleep } from "bun";
import { useMemo } from "preact/hooks";

const happyWindow = new GlobalWindow();

beforeAll(() => {
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement =
    happyWindow.HTMLElement as unknown as typeof HTMLElement;
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  // Set window.location.origin for requestFrom to work
  Object.defineProperty(window, "location", {
    value: new URL("http://localhost:3000"),
    writable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

// ============================================
// requestFrom tests
// ============================================

describe("requestFrom", () => {
  describe("URL handling", () => {
    it("should create Request with absolute URL", () => {
      const request = requestFrom("https://api.example.com/users");
      expect(request.url).toBe("https://api.example.com/users");
      expect(request.method).toBe("GET");
    });

    it("should create Request with relative URL using window.location.origin", () => {
      const request = requestFrom("/api/users");
      expect(request.url).toBe("http://localhost:3000/api/users");
    });

    it("should create Request with http URL", () => {
      const request = requestFrom("http://example.com/users");
      expect(request.url).toBe("http://example.com/users");
    });
  });

  describe("HTTP method handling", () => {
    it("should default to GET method", () => {
      const request = requestFrom("/users");
      expect(request.method).toBe("GET");
    });

    it("should use specified method from options", () => {
      const request = requestFrom("/users", { method: "POST" });
      expect(request.method).toBe("POST");
    });

    it("should support all HTTP methods", () => {
      const methods: ("GET" | "POST" | "PUT" | "DELETE" | "PATCH")[] = [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "PATCH",
      ];

      methods.forEach((method) => {
        const request = requestFrom("/users", { method });
        expect(request.method).toBe(method);
      });
    });
  });

  describe("Headers handling", () => {
    it("should create Request with empty Headers by default", () => {
      const request = requestFrom("/users");
      expect(request.headers).toBeInstanceOf(Headers);
      expect(request.headers.get("Content-Type")).toBeNull();
    });

    it("should merge custom headers", () => {
      const request = requestFrom("/users", {
        headers: { Authorization: "Bearer token123" },
      });
      expect(request.headers.get("Authorization")).toBe("Bearer token123");
    });
  });

  describe("objectBody handling for GET requests", () => {
    it("should convert objectBody to query parameters for GET requests", () => {
      const request = requestFrom("/users", {
        method: "GET",
        objectBody: { id: "123", name: "test" },
      });

      const url = new URL(request.url);
      expect(url.searchParams.get("id")).toBe("123");
      expect(url.searchParams.get("name")).toBe("test");
    });

    it("should handle array values in objectBody as multiple query params", () => {
      const request = requestFrom("/users", {
        method: "GET",
        objectBody: { ids: ["1", "2", "3"] },
      });

      const url = new URL(request.url);
      const ids = url.searchParams.getAll("ids");
      expect(ids).toEqual(["1", "2", "3"]);
    });

    it("should not set body for GET requests with objectBody", () => {
      const request = requestFrom("/users", {
        method: "GET",
        objectBody: { id: "123" },
      });
      expect(request.body).toBeNull();
    });

    it("should handle mixed scalar and array values", () => {
      const request = requestFrom("/users", {
        method: "GET",
        objectBody: { id: "123", tags: ["a", "b"] },
      });

      const url = new URL(request.url);
      expect(url.searchParams.get("id")).toBe("123");
      expect(url.searchParams.getAll("tags")).toEqual(["a", "b"]);
    });
  });

  describe("objectBody handling for non-GET requests", () => {
    it("should set Content-Type header to application/json for POST", () => {
      const request = requestFrom("/users", {
        method: "POST",
        objectBody: { name: "test" },
      });
      expect(request.headers.get("Content-Type")).toBe("application/json");
    });

    it("should stringify objectBody to JSON for POST", async () => {
      const request = requestFrom("/users", {
        method: "POST",
        objectBody: { name: "test", email: "test@example.com" },
      });

      const bodyText = await request.text();
      const body = JSON.parse(bodyText);
      expect(body).toEqual({ name: "test", email: "test@example.com" });
    });

    it("should stringify objectBody to JSON for PUT", async () => {
      const request = requestFrom("/users/1", {
        method: "PUT",
        objectBody: { name: "updated" },
      });

      const bodyText = await request.text();
      const body = JSON.parse(bodyText);
      expect(body).toEqual({ name: "updated" });
    });

    it("should stringify objectBody to JSON for DELETE", async () => {
      const request = requestFrom("/users/1", {
        method: "DELETE",
        objectBody: { force: true },
      });

      const bodyText = await request.text();
      const body = JSON.parse(bodyText);
      expect(body).toEqual({ force: true });
    });

    it("should stringify objectBody to JSON for PATCH", async () => {
      const request = requestFrom("/users/1", {
        method: "PATCH",
        objectBody: { name: "patched" },
      });

      const bodyText = await request.text();
      const body = JSON.parse(bodyText);
      expect(body).toEqual({ name: "patched" });
    });
  });

  describe("Additional request options", () => {
    it("should pass through additional RequestInit options", () => {
      const request = requestFrom("/users", {
        method: "POST",
        headers: { Authorization: "Bearer token" },
        credentials: "include",
      });

      expect(request.method).toBe("POST");
      expect(request.headers.get("Authorization")).toBe("Bearer token");
      expect(request.credentials).toBe("include");
    });

    it("should merge Headers with Content-Type for objectBody", () => {
      const request = requestFrom("/users", {
        method: "POST",
        objectBody: { name: "test" },
        headers: { Authorization: "Bearer token" },
      });

      expect(request.headers.get("Authorization")).toBe("Bearer token");
      expect(request.headers.get("Content-Type")).toBe("application/json");
    });
  });

  describe("Edge cases", () => {
    it("should handle undefined initWithBody", () => {
      const request = requestFrom("/users", undefined);
      expect(request.url).toBe("http://localhost:3000/users");
      expect(request.method).toBe("GET");
    });

    it("should handle null objectBody", () => {
      const request = requestFrom("/users", {
        method: "POST",
        objectBody: null,
      });
      expect(request.body).toBeNull();
    });

    it("should handle empty objectBody for GET", () => {
      const request = requestFrom("/users", {
        method: "GET",
        objectBody: {},
      });
      expect(request.body).toBeNull();
    });

    it("should handle empty objectBody for POST", async () => {
      const request = requestFrom("/users", {
        method: "POST",
        objectBody: {},
      });

      const bodyText = await request.text();
      expect(bodyText).toBe("{}");
    });

    it("should handle URL with existing query parameters", () => {
      const request = requestFrom("/users?id=existing", {
        method: "GET",
        objectBody: { name: "test" },
      });

      const url = new URL(request.url);
      expect(url.searchParams.get("id")).toBe("existing");
      expect(url.searchParams.get("name")).toBe("test");
    });
  });
});

// ============================================
// useAsync tests
// ============================================

describe("useAsync", () => {
  describe("Initial state", () => {
    it("should return correct shape", () => {
      const asyncFn = (input: string) => Promise.resolve("result");

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refresh");
      expect(typeof result.current.refresh).toBe("function");

      unmount();
    });

    it("should start with loading state true", () => {
      const asyncFn = (input: string) => Promise.resolve("result");

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      unmount();
    });
  });

  describe("Successful execution", () => {
    it("should resolve with data and set loading to false", async () => {
      const expectedData = { id: "1", name: "test" };
      const asyncFn = (input: string) => Promise.resolve(expectedData);

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      // Wait for async to complete - useLayoutEffect + async needs more time
      await Bun.sleep(100);

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(expectedData);
      expect(result.current.error).toBeNull();

      unmount();
    });

    it("should pass input to async function", async () => {
      const receivedInputs: string[] = [];
      const asyncFn = (input: string) => {
        receivedInputs.push(input);
        return Promise.resolve("result");
      };

      const { result, unmount } = renderHook(() =>
        useAsync("test-input", asyncFn),
      );

      await Bun.sleep(50);

      expect(receivedInputs).toContain("test-input");

      unmount();
    });

    it("should pass AbortSignal to async function", async () => {
      let receivedSignal: AbortSignal | null = null as AbortSignal | null;
      const asyncFn = (input: string, signal: AbortSignal) => {
        receivedSignal = signal;
        return Promise.resolve("result");
      };

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(50);

      expect(receivedSignal).toBeInstanceOf(AbortSignal);
      expect(receivedSignal?.aborted).toBe(false);

      unmount();
    });
  });

  describe("Error handling", () => {
    it("should catch and store Error objects", async () => {
      const testError = new Error("Test error");
      const asyncFn = (input: string) => Promise.reject(testError);

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(50);

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Test error");
      expect(result.current.data).toBeNull();

      unmount();
    });

    it("should convert non-Error rejections to Error objects", async () => {
      const asyncFn = (input: string) => Promise.reject("String error");

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(50);

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("String error");
      expect(result.current.data).toBeNull();

      unmount();
    });

    it("should not catch AbortError", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      const asyncFn = (input: string, signal: AbortSignal) => {
        // Reject with AbortError
        const err = new Error("Aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      };

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      // Wait for the async to complete
      await Bun.sleep(100);

      // AbortError should not be stored in state
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);

      unmount();
    });
  });

  describe("Refresh functionality", () => {
    it("should allow refetching data", async () => {
      const callCount = { count: 0 };
      const asyncFn = (input: string) => {
        callCount.count++;
        return Promise.resolve(`result-${callCount.count}`);
      };

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      // Wait for initial fetch
      await Bun.sleep(50);

      expect(result.current.data).toBe("result-1");
      expect(callCount.count).toBe(1);

      // Trigger refresh
      await result.current.refresh();
      // Wait for refresh to complete
      await Bun.sleep(50);

      expect(result.current.data).toBe("result-2");
      expect(callCount.count).toBe(2);

      unmount();
    });

    it("should pass latest input when refreshing", async () => {
      const receivedInputs: string[] = [];
      let resolveFn: (value: string) => void;
      const asyncFn = (input: string) => {
        receivedInputs.push(input);
        return new Promise((resolve) => {
          resolveFn = resolve;
        });
      };

      const { result, unmount, rerender } = renderHook(
        ({ input }) => useAsync(input, asyncFn),
        { initialProps: { input: "initial" } },
      );

      await Bun.sleep(50);

      // Update input
      rerender({ input: "updated" });

      // Resolve the promise
      resolveFn!("result");

      await Bun.sleep(100);

      expect(receivedInputs).toContain("updated");

      unmount();
    });

    it("should return data from refresh call", async () => {
      const asyncFn = (input: string) => Promise.resolve("refreshed-data");

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(50);

      const refreshResult = await result.current.refresh();
      expect(refreshResult).toBe("refreshed-data");

      unmount();
    });

    it("should handle refresh errors", async () => {
      const testError = new Error("Refresh error");
      let shouldFail = false;
      const asyncFn = (input: string) => {
        if (shouldFail) {
          return Promise.reject(testError);
        }
        return Promise.resolve("success");
      };

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(50);

      expect(result.current.data).toBe("success");
      expect(result.current.error).toBeNull();

      // Trigger failing refresh
      shouldFail = true;
      try {
        await result.current.refresh();
      } catch {
        // Expected to throw
      }

      await Bun.sleep(50);

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Refresh error");

      unmount();
    });
  });

  describe("Abort behavior", () => {
    it("should abort previous request when refreshing", async () => {
      const abortSignals: AbortSignal[] = [];
      let resolveFn: () => void;

      const asyncFn = (input: string, signal: AbortSignal) => {
        abortSignals.push(signal);
        return new Promise<void>((resolve) => {
          resolveFn = resolve;
        });
      };

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(20);

      // Trigger refresh (should abort first request)
      result.current.refresh().catch(() => {});

      await Bun.sleep(20);

      expect(abortSignals.length).toBe(2);
      expect(abortSignals[0]?.aborted).toBe(true);
      expect(abortSignals[1]?.aborted).toBe(false);

      // Clean up
      resolveFn!();
      unmount();
    });

    it("should abort request on unmount", async () => {
      let receivedSignal: AbortSignal | null = null as AbortSignal | null;

      const asyncFn = (input: string, signal: AbortSignal) => {
        receivedSignal = signal;
        return new Promise(() => {}); // Never resolves
      };

      const { unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(20);

      unmount();

      expect(receivedSignal?.aborted).toBe(true);
    });
  });

  describe("Mount state tracking", () => {
    it("should not update state after unmount", async () => {
      const asyncFn = (input: string) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve("late-result"), 100);
        });
      };

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      // Unmount immediately
      unmount();

      // Wait longer than the promise takes
      await Bun.sleep(150);

      // State should not have been updated
      expect(result.current.data).toBeNull();
    });
  });
});

// ============================================
// fetchJson tests
// ============================================

describe("fetchJson", () => {
  describe("Successful requests", () => {
    it("should fetch and parse JSON response", async () => {
      const expectedData = { id: "1", name: "test" };
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const signal = new AbortController().signal;
      const result = await fetchJson<typeof expectedData>(
        {
          url: "/api/users",
          options: { method: "GET" },
        },
        signal,
      );

      expect(result).toEqual(expectedData);
      expect(mockFetch.mock.calls.length).toBe(1);

      const request = mockFetch.mock.lastCall?.[0];
      expect(request).toBeInstanceOf(Request);
      expect(request?.url).toBe("http://localhost:3000/api/users");
    });

    it("should pass options to requestFrom", async () => {
      const expectedData = { ok: true };
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const signal = new AbortController().signal;
      await fetchJson(
        {
          url: "/api/users",
          options: {
            method: "POST",
            headers: { Authorization: "Bearer token" },
            objectBody: { name: "test" },
          },
        },
        signal,
      );

      const request = mockFetch.mock.lastCall?.[0];
      expect(request?.method).toBe("POST");
      expect(request?.headers.get("Authorization")).toBe("Bearer token");
      expect(request?.headers.get("Content-Type")).toBe("application/json");
    });

    it("should pass signal to requestFrom", async () => {
      const expectedData = { ok: true };
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const signal = new AbortController().signal;
      await fetchJson(
        {
          url: "/api/users",
          options: { method: "GET" },
        },
        signal,
      );

      const request = mockFetch.mock.lastCall?.[0];
      expect(request?.signal).toBe(signal);
    });

    it("should handle typed responses", async () => {
      interface User {
        id: string;
        name: string;
        email: string;
      }

      const expectedData: User = {
        id: "1",
        name: "test",
        email: "test@example.com",
      };

      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const signal = new AbortController().signal;
      const result = await fetchJson<User>(
        {
          url: "/api/users/1",
          options: { method: "GET" },
        },
        signal,
      );

      expect(result.id).toBe("1");
      expect(result.name).toBe("test");
      expect(result.email).toBe("test@example.com");
    });
  });

  describe("Error handling", () => {
    it("should throw on network errors", () => {
      const mockFetch = mock(() => {
        return Promise.reject(new Error("Network error"));
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const signal = new AbortController().signal;

      expect(() =>
        fetchJson(
          {
            url: "/api/users",
            options: { method: "GET" },
          },
          signal,
        ),
      ).toThrow("Network error");
    });

    it("should throw on JSON parse errors", () => {
      const mockFetch = mock(() => {
        return Promise.resolve(new Response("invalid json", { status: 200 }));
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const signal = new AbortController().signal;

      expect(() =>
        fetchJson(
          {
            url: "/api/users",
            options: { method: "GET" },
          },
          signal,
        ),
      ).toThrow();
    });

    it("should throw on HTTP errors", () => {
      const mockFetch = mock(() => {
        return Promise.resolve(
          new Response(JSON.stringify({ error: "Not found" }), { status: 404 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const signal = new AbortController().signal;

      expect(() =>
        fetchJson(
          {
            url: "/api/users/999",
            options: { method: "GET" },
          },
          signal,
        ),
      ).toThrow();
    });
  });
});

// ============================================
// useFetchJson tests
// ============================================

describe("useFetchJson", () => {
  describe("Initial state", () => {
    it("should return correct shape", () => {
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1" }), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("/api/users", { method: "GET" }),
      );

      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refresh");
      expect(typeof result.current.refresh).toBe("function");

      unmount();
    });

    it("should start with loading state", () => {
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1" }), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("/api/users", { method: "GET" }),
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      unmount();
    });
  });

  describe("Successful requests", () => {
    it("should fetch data and update state", async () => {
      const expectedData = { id: "1", name: "test" };
      const mockFetch = mock(async (request: Request) => {
        return new Response(JSON.stringify(expectedData), { status: 200 });
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("/api/users", { method: "GET" }),
      );

      // Wait for fetch to complete
      await Bun.sleep(50);

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(expectedData);
      expect(result.current.error).toBeNull();

      unmount();
    });

    it("should make correct request", async () => {
      const expectedData = { id: "1" };
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("/api/users", {
          method: "POST",
          objectBody: { name: "test" },
          headers: { Authorization: "Bearer token" },
        }),
      );

      await Bun.sleep(50);

      expect(mockFetch.mock.calls.length).toBe(1);

      const request = mockFetch.mock.lastCall?.[0];
      expect(request?.method).toBe("POST");
      expect(request?.headers.get("Authorization")).toBe("Bearer token");
      expect(request?.headers.get("Content-Type")).toBe("application/json");

      unmount();
    });

    it("should handle typed responses", async () => {
      interface User {
        id: string;
        name: string;
      }

      const expectedData: User = { id: "1", name: "test" };
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson<User>("/api/users/1", { method: "GET" }),
      );

      await Bun.sleep(50);

      expect(result.current.data).toEqual(expectedData);
      expect(result.current.data?.id).toBe("1");
      expect(result.current.data?.name).toBe("test");

      unmount();
    });
  });

  describe("Error handling", () => {
    it("should handle fetch errors", async () => {
      const mockFetch = mock(() => {
        return Promise.reject(new Error("Network error"));
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      // Suppress console error
      const consoleSpy = mock(() => {});
      const originalError = console.error;
      console.error = consoleSpy;

      try {
        const { result, unmount } = renderHook(() =>
          useFetchJson("/api/users", { method: "GET" }),
        );

        await Bun.sleep(50);

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.data).toBeNull();

        unmount();
      } finally {
        console.error = originalError;
      }
    });

    it("should handle JSON parse errors", async () => {
      const mockFetch = mock(() => {
        return Promise.resolve(new Response("invalid json", { status: 200 }));
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      // Suppress console error
      const consoleSpy = mock(() => {});
      const originalError = console.error;
      console.error = consoleSpy;

      try {
        const { result, unmount } = renderHook(() =>
          useFetchJson("/api/users", { method: "GET" }),
        );

        await Bun.sleep(50);

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeInstanceOf(Error);

        unmount();
      } finally {
        console.error = originalError;
      }
    });
  });

  describe("Refresh functionality", () => {
    it("should allow refetching data", async () => {
      const callCount = { count: 0 };
      const mockFetch = mock((request: Request) => {
        callCount.count++;
        return Promise.resolve(
          new Response(JSON.stringify({ id: String(callCount.count) }), {
            status: 200,
          }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("/api/users", { method: "GET" }),
      );

      // Wait for initial fetch
      await Bun.sleep(50);

      expect(callCount.count).toBe(1);
      expect(result.current.data).toEqual({ id: "1" });

      // Trigger refresh
      await result.current.refresh();
      // Wait for refresh to complete
      await Bun.sleep(50);

      expect(callCount.count).toBe(2);
      expect(result.current.data).toEqual({ id: "2" });

      unmount();
    });

    it("should return data from refresh call", async () => {
      const expectedData = { id: "refreshed" };
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("/api/users", { method: "GET" }),
      );

      await Bun.sleep(50);

      const refreshResult = await result.current.refresh();
      expect(refreshResult).toEqual(expectedData);

      unmount();
    });
  });

  describe("Abort behavior", () => {
    it("should abort request on unmount", async () => {
      let receivedSignal: AbortSignal | null = null as AbortSignal | null;

      const mockFetch = mock((request: Request) => {
        receivedSignal = request.signal;
        return new Promise(() => {}); // Never resolves
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { unmount } = renderHook(() =>
        useFetchJson("/api/users", { method: "GET" }),
      );

      await Bun.sleep(20);

      unmount();

      expect(receivedSignal?.aborted).toBe(true);
    });
  });

  describe("Integration with requestFrom", () => {
    it("should use requestFrom for request creation", async () => {
      const expectedData = { id: "1" };
      const mockFetch = mock((request: Request) => {
        // Verify request was created by requestFrom
        expect(request).toBeInstanceOf(Request);
        expect(request.url).toContain("/api/users");
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("/api/users", {
          method: "GET",
          objectBody: { id: "123" },
        }),
      );

      await Bun.sleep(50);

      expect(result.current.data).toEqual(expectedData);

      const request = mockFetch.mock.lastCall?.[0];
      const url = new URL(request!.url);
      expect(url.searchParams.get("id")).toBe("123");

      unmount();
    });

    it("should handle relative URLs", async () => {
      const expectedData = { ok: true };
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("users", { method: "GET" }),
      );

      await Bun.sleep(50);

      expect(result.current.data).toEqual(expectedData);

      const request = mockFetch.mock.lastCall?.[0];
      expect(request?.url).toBe("http://localhost:3000/users");

      unmount();
    });

    it("should handle absolute URLs", async () => {
      const expectedData = { ok: true };
      const mockFetch = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        );
      });

      // @ts-ignore
      globalThis.fetch = mockFetch;

      const { result, unmount } = renderHook(() =>
        useFetchJson("https://api.example.com/users", { method: "GET" }),
      );

      await Bun.sleep(50);

      expect(result.current.data).toEqual(expectedData);

      const request = mockFetch.mock.lastCall?.[0];
      expect(request?.url).toBe("https://api.example.com/users");

      unmount();
    });
  });
});
