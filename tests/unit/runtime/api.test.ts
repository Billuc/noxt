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
import * as v from "valibot";
import { renderHook } from "@testing-library/preact";
import { GlobalWindow } from "happy-dom";
import { ApiRouter, useApi } from "../../../src/runtime/api";

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
  "GET /users": {
    input: v.object({ id: v.string() }),
    output: v.object({ id: v.string(), name: v.string() }),
  },
  "POST /users": {
    input: v.object({ name: v.string(), email: v.string() }),
    output: v.object({ id: v.string(), name: v.string(), email: v.string() }),
  },
  "PUT /users": {
    input: v.object({ id: v.string(), name: v.string() }),
    output: v.object({ id: v.string(), name: v.string() }),
  },
  "DELETE /users": {
    input: v.object({ id: v.string() }),
    output: v.object({ success: v.boolean() }),
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

    it("should create instance with custom fetcher", () => {
      const customFetcher = (request: Request) =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      const router = new ApiRouter<TestApi>(
        "https://api.example.com",
        customFetcher,
      );
      expect(router).toBeInstanceOf(ApiRouter);
    });
  });

  describe("api() method", () => {
    it("should return a function for the endpoint", () => {
      const router = new ApiRouter<TestApi>();
      const endpointCaller = router.api("GET /users");
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

      const router = new ApiRouter<TestApi>("", customFetcher);
      const endpointCaller = router.api("GET /users");
      await endpointCaller({ id: "123" });

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

      const router = new ApiRouter<TestApi>(
        "https://api.example.com",
        customFetcher,
      );
      const endpointCaller = router.api("GET /users");
      await endpointCaller({ id: "123" });

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

      const router = new ApiRouter<TestApi>("", customFetcher);
      const endpointCaller = router.api("POST /users");
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

      const router = new ApiRouter<TestApi>("", customFetcher);
      const endpointCaller = router.api("POST /users");
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

      const router = new ApiRouter<TestApi>("", customFetcher);
      const endpointCaller = router.api("GET /users");
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

      const router = new ApiRouter<TestApi>(
        "https://api.example.com",
        customFetcher,
      );
      const endpointCaller = router.api("GET /users");

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

      const router = new ApiRouter<TestApi>("", customFetcher);
      const endpointCaller = router.api("GET /users");

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

      const router = new ApiRouter<TestApi>("", customFetcher);
      const endpointCaller = router.api("GET /users");

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
        "GET /users",
        "POST /users",
        "PUT /users",
        "DELETE /users",
      ] as const;

      const customFetcher = mock((request: Request) => {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      });

      const router = new ApiRouter<TestApi>("", customFetcher);

      for (const endpoint of endpoints) {
        const endpointCaller = router.api(endpoint);
        const [expectedMethod] = endpoint.split(" ", 2);

        // Call with minimal required input based on method
        const input =
          endpoint.startsWith("GET") || endpoint.startsWith("DELETE")
            ? { id: "1" }
            : { id: "1", name: "test", email: "test@example.com" };

        await endpointCaller(input as any);
        const requestMethod = customFetcher.mock.lastCall?.[0].method;
        expect(requestMethod).toBe(expectedMethod);
      }
    });
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
      (input: { id: string }, options?: RequestInit) => {
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
    expect(receivedOptions?.headers).toEqual({ Authorization: "Bearer token" });
    expect(receivedOptions?.signal).toBeInstanceOf(AbortSignal);

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

    const endpointCaller = mock((input: any, options?: RequestInit) => {
      abortSignals.push(options?.signal ?? null);
      return new Promise(() => {}); // Never resolves
    });

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

    const router = new ApiRouter<TestApi>("", customFetcher);
    const getUserCaller = router.api("GET /users");

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

    const router = new ApiRouter<TestApi>("", customFetcher);

    // Test GET endpoint
    const getUser = router.api("GET /users");
    const getResult = await getUser({ id: "1" });
    expect(getResult).toEqual({ id: "1", name: "test user" });

    // Test POST endpoint
    const createUser = router.api("POST /users");
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
