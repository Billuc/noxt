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

import { describe, it, expect, beforeAll, afterEach } from "bun:test";
import { renderHook } from "@testing-library/preact";
import { GlobalWindow } from "happy-dom";
import * as devalue from "devalue";
import {
  copyFetchRequestInit,
  requestFrom,
  useAsync,
} from "../../../src/runtime/fetch";

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
    it("should set Content-Type header to application/x-devalue for POST", () => {
      const request = requestFrom("/users", {
        method: "POST",
        objectBody: { name: "test" },
      });
      expect(request.headers.get("Content-Type")).toBe(
        "application/x-devalue",
      );
    });

    it("should stringify objectBody with devalue for POST", async () => {
      const request = requestFrom("/users", {
        method: "POST",
        objectBody: { name: "test", email: "test@example.com" },
      });

      const bodyText = await request.text();
      const body = devalue.parse(bodyText);
      expect(body).toEqual({ name: "test", email: "test@example.com" });
    });

    it("should stringify objectBody with devalue for PUT", async () => {
      const request = requestFrom("/users/1", {
        method: "PUT",
        objectBody: { name: "updated" },
      });

      const bodyText = await request.text();
      const body = devalue.parse(bodyText);
      expect(body).toEqual({ name: "updated" });
    });

    it("should stringify objectBody with devalue for DELETE", async () => {
      const request = requestFrom("/users/1", {
        method: "DELETE",
        objectBody: { force: true },
      });

      const bodyText = await request.text();
      const body = devalue.parse(bodyText);
      expect(body).toEqual({ force: true });
    });

    it("should stringify objectBody with devalue for PATCH", async () => {
      const request = requestFrom("/users/1", {
        method: "PATCH",
        objectBody: { name: "patched" },
      });

      const bodyText = await request.text();
      const body = devalue.parse(bodyText);
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
      expect(request.headers.get("Content-Type")).toBe(
        "application/x-devalue",
      );
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
      expect(devalue.parse(bodyText)).toEqual({});
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
      const asyncFn = (_input: string) => Promise.resolve("result");

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      expect(result.current).toHaveProperty("data");
      expect(result.current).toHaveProperty("loading");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("refresh");
      expect(typeof result.current.refresh).toBe("function");

      unmount();
    });

    it("should start with loading state true", () => {
      const asyncFn = (_input: string) => Promise.resolve("result");

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
      const asyncFn = (_input: string) => Promise.resolve(expectedData);

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

      const { unmount } = renderHook(() => useAsync("test-input", asyncFn));

      await Bun.sleep(50);

      expect(receivedInputs).toContain("test-input");

      unmount();
    });

    it("should pass AbortSignal to async function", async () => {
      let receivedSignal: AbortSignal | null = null as AbortSignal | null;
      const asyncFn = (_input: string, signal: AbortSignal) => {
        receivedSignal = signal;
        return Promise.resolve("result");
      };

      const { unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(50);

      expect(receivedSignal).toBeInstanceOf(AbortSignal);
      expect(receivedSignal?.aborted).toBe(false);

      unmount();
    });
  });

  describe("Error handling", () => {
    it("should catch and store Error objects", async () => {
      const testError = new Error("Test error");
      const asyncFn = (_input: string) => Promise.reject(testError);

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(50);

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe("Test error");
      expect(result.current.data).toBeNull();

      unmount();
    });

    it("should convert non-Error rejections to Error objects", async () => {
      const asyncFn = (_input: string) => Promise.reject("String error");

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
      const asyncFn = (_input: string, _signal: AbortSignal) => {
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
      const asyncFn = (_input: string) => {
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

      const { unmount, rerender } = renderHook(
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
      const asyncFn = (_input: string) => Promise.resolve("refreshed-data");

      const { result, unmount } = renderHook(() => useAsync("test", asyncFn));

      await Bun.sleep(50);

      const refreshResult = await result.current.refresh();
      expect(refreshResult).toBe("refreshed-data");

      unmount();
    });

    it("should handle refresh errors", async () => {
      const testError = new Error("Refresh error");
      let shouldFail = false;
      const asyncFn = (_input: string) => {
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

      const asyncFn = (_input: string, signal: AbortSignal) => {
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

      const asyncFn = (_input: string, signal: AbortSignal) => {
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
      const asyncFn = (_input: string) => {
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
// copyFetchRequestInit tests (added with devalue body change)
// ============================================

describe("copyFetchRequestInit", () => {
  it("should copy scalar fields", () => {
    const init = {
      method: "POST",
      cache: "no-cache" as RequestCache,
      credentials: "include" as RequestCredentials,
      objectBody: { name: "test" },
    };
    const copy = copyFetchRequestInit(init);
    expect(copy).toMatchObject(init);
    expect(copy).not.toBe(init);
  });

  it("should clone headers so mutations do not leak to the caller", () => {
    const objectHeaders = { Authorization: "Bearer token" };
    const copyObject = copyFetchRequestInit({ headers: objectHeaders });
    expect(copyObject.headers).toEqual(objectHeaders);
    (copyObject.headers as Record<string, string>)["Accept"] = "text/html";
    expect(objectHeaders).not.toHaveProperty("Accept");

    const arrayHeaders: [string, string][] = [["Authorization", "Bearer"]];
    const copyArray = copyFetchRequestInit({ headers: arrayHeaders });
    expect(copyArray.headers).toEqual(arrayHeaders);
    (copyArray.headers as [string, string][]).push(["Accept", "text/html"]);
    expect(arrayHeaders).toHaveLength(1);
  });

  it("should default missing headers to an empty object", () => {
    expect(copyFetchRequestInit({}).headers).toEqual({});
  });
});
