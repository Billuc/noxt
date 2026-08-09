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

import { describe, it, expect, beforeAll, afterEach, mock } from "bun:test";
import * as v from "valibot";
import { renderHook } from "@testing-library/preact";
import { GlobalWindow } from "happy-dom";
import { ApiRouter, useApi, getApiHandlers } from "../../../src/runtime/api";
import type { FetchRequestInit } from "../../../src/runtime/fetch";
import { APIEndpoint } from "../../../src/api";

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

// Note: @testing-library/preact's renderHook uses act() for updates, requiring longer wait times

// Define test API types - keys must be strings in format "METHOD /path"
const TestApi = {
  "/users": {
    GET: {
      input: v.object({ id: v.string() }),
      output: v.object({ id: v.string(), name: v.string() }),
    },
    POST: {
      input: v.object({ name: v.string(), email: v.string() }),
      output: v.object({ id: v.string(), name: v.string(), email: v.string() }),
    },
    PUT: {
      input: v.object({ id: v.string(), name: v.string() }),
      output: v.object({ id: v.string(), name: v.string() }),
    },
    DELETE: {
      input: v.object({ id: v.string() }),
      output: v.object({ success: v.boolean() }),
    },
  },
} as const;

type TestApi = typeof TestApi;

describe("ApiRouter", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("constructor", () => {
    it("should create instance without base URL", () => {
      const router = new ApiRouter<TestApi>();
      expect(router).toBeInstanceOf(ApiRouter);
    });

    it("should create instance with base URL", () => {
      const router = new ApiRouter<TestApi>("https://api.example.com");
      expect(router).toBeInstanceOf(ApiRouter);
    });
  });

  describe("api() method", () => {
    it("should return a function for the endpoint", () => {
      const router = new ApiRouter<TestApi>();
      const endpointCaller = router.api("/users", "GET");
      expect(typeof endpointCaller).toBe("function");
    });

    it("should parse endpoint string to extract method and URL", async () => {
      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1", name: "test" }), {
            status: 200,
          }),
        );
      });

      const router = new ApiRouter<TestApi>("");
      const endpointCaller = router.api("/users", "GET", customFetcher);
      await endpointCaller!({ id: "123" });

      const requestMethod = customFetcher.mock.lastCall?.[0].method;
      const requestUrl = customFetcher.mock.lastCall?.[0].url;

      expect(requestMethod).toBe("GET");
      expect(requestUrl).toContain("/users");
    });

    it("should prepend base URL to endpoint URL", async () => {
      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1", name: "test" }), {
            status: 200,
          }),
        );
      });

      const router = new ApiRouter<TestApi>("https://api.example.com");
      const endpointCaller = router.api("/users", "GET", customFetcher);
      await endpointCaller!({ id: "123" });

      const requestUrl = customFetcher.mock.lastCall?.[0].url;
      expect(requestUrl).toBe("https://api.example.com/users?id=123");
    });

    it("should use correct HTTP method from endpoint string", async () => {
      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1", name: "test" }), {
            status: 200,
          }),
        );
      });

      const router = new ApiRouter<TestApi>("");
      const endpointCaller = router.api("/users", "POST", customFetcher);
      await endpointCaller({ name: "test", email: "test@example.com" });

      const requestMethod = customFetcher.mock.lastCall?.[0].method;
      expect(requestMethod).toBe("POST");
    });

    it("should set Content-Type header for POST request", async () => {
      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "1",
              name: "test",
              email: "test@example.com",
            }),
            { status: 200 },
          ),
        );
      });

      const router = new ApiRouter<TestApi>("");
      const endpointCaller = router.api("/users", "POST", customFetcher);
      await endpointCaller({ name: "test", email: "test@example.com" });

      const requestHeaders = customFetcher.mock.lastCall?.[0].headers;
      expect(requestHeaders?.get("Content-Type")).toBe("application/json");
    });

    it("should send input as query params for GET request", async () => {
      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1", name: "test" }), {
            status: 200,
          }),
        );
      });

      const router = new ApiRouter<TestApi>("");
      const endpointCaller = router.api("/users", "GET", customFetcher);
      await endpointCaller({ id: "123" });

      const requestUrl = customFetcher.mock.lastCall?.[0].url;
      expect(requestUrl).not.toBeUndefined();
      const url = new URL(requestUrl!);
      expect(url.searchParams.get("id")).toBe("123");
    });

    it("should use custom fetcher when provided", async () => {
      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1", name: "test" }), {
            status: 200,
          }),
        );
      });

      const router = new ApiRouter<TestApi>("https://api.example.com");
      const endpointCaller = router.api("/users", "GET", customFetcher);

      await endpointCaller({ id: "123" });

      expect(customFetcher.mock.calls.length).toBe(1);
    });

    it("should return parsed JSON response", async () => {
      const expectedData = { id: "1", name: "test" };
      const customFetcher = mock((request: Request) =>
        Promise.resolve(
          new Response(JSON.stringify(expectedData), { status: 200 }),
        ),
      );

      const router = new ApiRouter<TestApi>("");
      const endpointCaller = router.api("/users", "GET", customFetcher);

      const result = await endpointCaller({ id: "1" });

      expect(result).toEqual(expectedData);
    });

    it("should pass additional options to fetch request", async () => {
      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1", name: "test" }), {
            status: 200,
          }),
        );
      });

      const router = new ApiRouter<TestApi>("");
      const endpointCaller = router.api("/users", "GET", customFetcher);

      await endpointCaller(
        { id: "123" },
        {
          headers: { Authorization: "Bearer token123" },
        },
      );

      const requestHeaders = customFetcher.mock.lastCall?.[0].headers;
      expect(requestHeaders?.get("Authorization")).toBe("Bearer token123");
    });

    it("should handle different HTTP methods", async () => {
      const endpoints = [
        ["/users", "GET"],
        ["/users", "POST"],
        ["/users", "PUT"],
        ["/users", "DELETE"],
      ] as const;

      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      });

      const router = new ApiRouter<TestApi>("");

      for (const [route, method] of endpoints) {
        const endpointCaller = router.api(route, method, customFetcher);

        // Call with minimal required input based on method
        const input =
          method === "GET" || method === "DELETE"
            ? { id: "1" }
            : { id: "1", name: "test", email: "test@example.com" };

        await endpointCaller(input as any);
        const requestMethod = customFetcher.mock.lastCall?.[0].method;
        expect(requestMethod).toBe(method);
      }
    });

    // it("should return undefined for incorrect endpoints", async () => {
    //   const customFetcher = mock((request: Request) => {
    //     return Promise.resolve(
    //       new Response(JSON.stringify({ ok: true }), { status: 200 }),
    //     );
    //   });

    //   const router = new ApiRouter<TestApi>("", customFetcher);

    //   // @ts-ignore
    //   const endpointCaller = router.api("/api/toto", "GET");
    //   expect(endpointCaller).toBeUndefined();
    // });
  });
});

describe("useApi", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should return useAsync result shape", () => {
    const endpointCaller = (input: { id: string }) =>
      Promise.resolve({ id: "1", name: "test" });

    const { result, unmount } = renderHook(() =>
      useApi(endpointCaller as any, { id: "1" }),
    );

    expect(result.current).toHaveProperty("data");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("refresh");
    expect(typeof result.current.refresh).toBe("function");

    unmount();
  });

  it("should start with loading state", () => {
    const endpointCaller = (input: { id: string }) =>
      Promise.resolve({ id: "1", name: "test" });

    const { result, unmount } = renderHook(() =>
      useApi(endpointCaller as any, { id: "1" }),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    unmount();
  });

  it("should pass input to endpoint caller", async () => {
    const endpointCaller = mock((input: { id: string }) => {
      return Promise.resolve({ id: "1", name: "test" });
    });

    const { result, unmount } = renderHook(() =>
      useApi(endpointCaller as any, { id: "123" }),
    );

    // Wait for the async fetch to complete
    await Bun.sleep(50);

    expect(endpointCaller.mock.lastCall?.[0]).toEqual({ id: "123" });

    unmount();
  });

  it("should pass options to endpoint caller including signal", async () => {
    const endpointCaller = mock(
      (
        input: { id: string },
        options?: FetchRequestInit,
        signal?: AbortSignal,
      ) => {
        return Promise.resolve({ id: "1", name: "test" });
      },
    );

    const { result, unmount } = renderHook(() =>
      useApi(
        endpointCaller as any,
        { id: "123" },
        { headers: { Authorization: "Bearer token" } },
      ),
    );

    // Wait for the async fetch to complete
    await Bun.sleep(50);

    // Should have the headers plus the signal
    const receivedOptions = endpointCaller.mock.lastCall?.[1];
    const receivedSignal = endpointCaller.mock.lastCall?.[2];
    expect(receivedOptions?.headers).toEqual({ Authorization: "Bearer token" });
    expect(receivedSignal).toBeInstanceOf(AbortSignal);

    unmount();
  });

  it("should handle successful response", async () => {
    const expectedData = { id: "1", name: "test user" };

    const endpointCaller = () => Promise.resolve(expectedData);

    const { result, unmount } = renderHook(() =>
      useApi(endpointCaller as any, { id: "1" }),
    );

    // Wait for the async fetch to complete - needs extra time
    await Bun.sleep(100);

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(expectedData);
    expect(result.current.error).toBeNull();

    unmount();
  });

  it("should handle error from endpoint caller", async () => {
    const testError = new Error("API Error");
    const endpointCaller = () => Promise.reject(testError);

    const { result, unmount } = renderHook(() =>
      useApi(endpointCaller as any, { id: "1" }),
    );

    // Wait for the async fetch to complete
    await Bun.sleep(50);

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("API Error");

    unmount();
  });

  it("should allow refetching", async () => {
    const responses = [
      { id: "1", name: "user1" },
      { id: "2", name: "user2" },
    ];
    let responseIndex = 0;
    const endpointCaller = mock(() => {
      return Promise.resolve(responses[responseIndex++]);
    });

    const { result, unmount } = renderHook(() =>
      useApi(endpointCaller as any, { id: "1" }),
    );

    // Wait for initial fetch
    await Bun.sleep(50);

    expect(endpointCaller.mock.calls.length).toBe(1);
    expect(result.current.data).toEqual(responses[0]);

    // Refetch
    await result.current.refresh();
    // Wait for refetch to complete
    await Bun.sleep(50);

    expect(endpointCaller.mock.calls.length).toBe(2);
    expect(result.current.data).toEqual(responses[1]);

    unmount();
  });

  it("should pass signal to endpoint caller for abort", async () => {
    const abortSignals: (AbortSignal | null)[] = [];

    const endpointCaller = mock(
      (input: any, options?: FetchRequestInit, signal?: AbortSignal) => {
        abortSignals.push(signal ?? null);
        return new Promise(() => {}); // Never resolves
      },
    );

    const { result, unmount } = renderHook(() =>
      useApi(endpointCaller as any, { id: "1" }),
    );

    // Wait a bit for the fetch to start
    await Bun.sleep(20);

    expect(abortSignals.length).toBe(1);
    expect(abortSignals[0]).not.toBeNull();
    expect(abortSignals[0]).toBeInstanceOf(AbortSignal);
    expect(abortSignals[0]?.aborted).toBe(false);

    unmount();

    expect(abortSignals.length).toBe(1);
    expect(abortSignals[0]?.aborted).toBe(true);
  });

  it("should integrate with ApiRouter", async () => {
    const expectedData = { id: "1", name: "test user" };

    const customFetcher = mock((request: Request) =>
      Promise.resolve(
        new Response(JSON.stringify(expectedData), { status: 200 }),
      ),
    );

    const router = new ApiRouter<TestApi>("");
    const getUserCaller = router.api("/users", "GET", customFetcher);

    const { result, unmount } = renderHook(() =>
      useApi(getUserCaller, { id: "1" }),
    );

    // Wait for the fetch to complete - needs more time with @testing-library/preact
    await Bun.sleep(100);

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(expectedData);
    expect(result.current.error).toBeNull();
    expect(customFetcher.mock.calls.length).toBe(1);

    unmount();
  });

  it("should work with different endpoint types", async () => {
    const customFetcher = mock((request: Request) => {
      const url = new URL(request.url);
      const method = request.method;

      // Return different responses based on the endpoint
      if (method === "GET" && url.pathname.includes("/users")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "1", name: "test user" }), {
            status: 200,
          }),
        );
      } else if (method === "POST" && url.pathname === "/users") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "1",
              name: "new user",
              email: "new@example.com",
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    });

    const router = new ApiRouter<TestApi>("");

    // Test GET endpoint
    const getUser = router.api("/users", "GET", customFetcher);
    const getResult = await getUser({ id: "1" });
    expect(getResult).toEqual({ id: "1", name: "test user" });

    // Test POST endpoint
    const createUser = router.api("/users", "POST", customFetcher);
    const postResult = await createUser({
      name: "new user",
      email: "new@example.com",
    });
    expect(postResult).toEqual({
      id: "1",
      name: "new user",
      email: "new@example.com",
    });
  });
});

describe("getApiHandlers", () => {
  it("should extract handlers from API definitions", () => {
    const mockHandler = (_request: Request) => Promise.resolve(new Response());
    const apiMap = {
      "/api/users": {
        GET: new APIEndpoint(v.object({}), v.object({}), mockHandler),
      },
    };

    const result = getApiHandlers(apiMap);

    expect(result).toEqual({
      "/api/users": {
        GET: mockHandler,
      },
    });
  });

  it("should handle multiple routes and methods", () => {
    const getHandler = (_request: Request) => Promise.resolve(new Response());
    const postHandler = (_request: Request) => Promise.resolve(new Response());
    const apiMap = {
      "/api/users": {
        GET: new APIEndpoint(v.object({}), v.object({}), getHandler),
        POST: new APIEndpoint(v.object({}), v.object({}), postHandler),
      },
      "/api/posts": {
        GET: new APIEndpoint(v.object({}), v.object({}), getHandler),
      },
    };

    const result = getApiHandlers(apiMap);

    expect(result).toEqual({
      "/api/users": {
        GET: getHandler,
        POST: postHandler,
      },
      "/api/posts": {
        GET: getHandler,
      },
    });
  });

  it("should handle empty API definitions", () => {
    const result = getApiHandlers({});
    expect(result).toEqual({});
  });

  it("should handle routes with no methods", () => {
    const apiMap = {
      "/api/users": {},
    };

    const result = getApiHandlers(apiMap);
    expect(result).toEqual({
      "/api/users": {},
    });
  });

  it("should preserve handler references", () => {
    const handler1 = (_request: Request) => Promise.resolve(new Response());
    const handler2 = (_request: Request) => Promise.resolve(new Response());
    const apiMap = {
      "/api/test": {
        GET: new APIEndpoint(v.object({}), v.object({}), handler1),
        POST: new APIEndpoint(v.object({}), v.object({}), handler2),
      },
    };

    const result = getApiHandlers(apiMap);

    expect(result["/api/test"].GET).toBe(handler1);
    expect(result["/api/test"].POST).toBe(handler2);
  });
});
