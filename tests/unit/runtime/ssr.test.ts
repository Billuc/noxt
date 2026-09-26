import { describe, it, expect, beforeAll, mock } from "bun:test";
import * as s from "superstruct";
import * as devalue from "devalue";
import { GlobalWindow } from "happy-dom";
import {
  getSSRHandlers,
  makeSSRFn,
  makeSSRUrlFn,
} from "../../../src/runtime/ssr";
import { SSRRoute } from "../../../src/ssr/types";
import { h } from "preact";

const happyWindow = new GlobalWindow();

beforeAll(() => {
  globalThis.document = happyWindow.document as unknown as Document;
  globalThis.HTMLElement =
    happyWindow.HTMLElement as unknown as typeof HTMLElement;
  globalThis.window = happyWindow as unknown as Window & typeof globalThis;
  Object.defineProperty(window, "location", {
    value: new URL("http://localhost:3000"),
    writable: true,
  });
});

const TestSsr = {
  "/frag": {
    GET: { input: s.object({ q: s.string() }) },
    POST: { input: s.object({ name: s.string() }) },
  },
  "/empty": {
    GET: { input: s.object({}) },
  },
} as const;

type TestSsr = typeof TestSsr;

describe("getSSRHandlers", () => {
  it("extracts handlers keyed by route+method", () => {
    const handler = (_req: Request) => Promise.resolve(new Response("x"));
    const ssrMap = {
      "/page": { GET: new SSRRoute(s.object({}), handler) },
    };

    expect(getSSRHandlers(ssrMap)).toEqual({ "/page": { GET: handler } });
  });

  it("prefixes routes with base", () => {
    const handler = (_req: Request) => Promise.resolve(new Response("x"));
    const ssrMap = {
      "/page": { GET: new SSRRoute(s.object({}), handler) },
    };

    expect(getSSRHandlers(ssrMap, "/base")).toEqual({
      "/base/page": { GET: handler },
    });
  });

  it("handles multiple routes/methods and empty map", () => {
    const h1 = (_req: Request) => Promise.resolve(new Response("1"));
    const h2 = (_req: Request) => Promise.resolve(new Response("2"));
    const ssrMap = {
      "/a": {
        GET: new SSRRoute(s.object({}), h1),
        POST: new SSRRoute(s.object({}), h2),
      },
      "/b": { GET: new SSRRoute(s.object({}), h1) },
    };

    const out = getSSRHandlers(ssrMap);

    expect(out["/a"].GET).toBe(h1);
    expect(out["/a"].POST).toBe(h2);
    expect(out["/b"].GET).toBe(h1);

    expect(getSSRHandlers({})).toEqual({});
  });

  it("handlers render HTML end-to-end", async () => {
    const { query } = await import("../../../src/ssr/builder");

    const route = query()
      .input(s.object({ name: s.string() }))
      .route(({ input }) => h("div", {}, `Hi ${input.name}`));

    const handlers = getSSRHandlers({
      "/hello": { GET: route },
    });
    const res = await handlers["/hello"].GET(
      new Request("http://localhost/hello?name=Ann"),
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Hi Ann");
  });
});

describe("makeSSRFn", () => {
  it("should return a function for the endpoint", () => {
    const ssr = makeSSRFn<TestSsr>("");
    expect(typeof ssr("/frag", "GET")).toBe("function");
  });

  it("should prepend base and encode GET input as query", async () => {
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response("<div>hi</div>")),
    );

    const ssr = makeSSRFn<TestSsr>("https://example.com/base");
    const html = await ssr("/frag", "GET", fetcher)({ q: "x" });

    expect(html).toBe("<div>hi</div>");
    expect(fetcher.mock.lastCall?.[0].url).toBe(
      "https://example.com/base/frag?q=x",
    );
    expect(fetcher.mock.lastCall?.[0].method).toBe("GET");
  });

  it("should send Accept: text/html", async () => {
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response("<p/>")),
    );

    const ssr = makeSSRFn<TestSsr>("");
    await ssr("/frag", "GET", fetcher)({ q: "a" });

    expect(fetcher.mock.lastCall?.[0].headers.get("Accept")).toBe("text/html");
  });

  it("should send POST input as devalue body", async () => {
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response("<p>ok</p>")),
    );

    const ssr = makeSSRFn<TestSsr>("");
    const html = await ssr("/frag", "POST", fetcher)({ name: "ann" });

    expect(html).toBe("<p>ok</p>");
    const req: Request = fetcher.mock.lastCall?.[0]!;
    expect(req.method).toBe("POST");
    expect(req.headers.get("Content-Type")).toBe("application/x-devalue");
    expect(devalue.parse(await req.text())).toEqual({ name: "ann" });
  });

  it("should forward extra fetch options and signal", async () => {
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response("<p/>")),
    );

    const ssr = makeSSRFn<TestSsr>("");
    const controller = new AbortController();
    await ssr("/frag", "GET", fetcher)(
      { q: "1" },
      { headers: { Authorization: "Bearer t" } },
      controller.signal,
    );

    const req: Request = fetcher.mock.lastCall?.[0]!;
    expect(req.headers.get("Authorization")).toBe("Bearer t");
    expect(req.headers.get("Accept")).toBe("text/html");
    expect(req.signal).toBe(controller.signal);
  });

  it("should throw FetchError on non-ok responses", async () => {
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response("nope", { status: 500 })),
    );

    const ssr = makeSSRFn<TestSsr>("");
    await expect(ssr("/frag", "GET", fetcher)({ q: "x" })).rejects.toThrow(
      "Error 500",
    );
  });

  it("should not mutate the caller-provided options object", async () => {
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response("<p/>")),
    );

    const ssr = makeSSRFn<TestSsr>("");
    const options = { headers: { Authorization: "Bearer t" } };
    await ssr("/frag", "GET", fetcher)({ q: "x" }, options);

    expect(options.headers).toEqual({ Authorization: "Bearer t" });
  });

  it("should default base to empty string when omitted", async () => {
    const fetcher = mock((_request: Request) =>
      Promise.resolve(new Response("<p/>")),
    );

    const ssr = makeSSRFn<TestSsr>();
    await ssr("/frag", "GET", fetcher)({ q: "1" });

    expect(fetcher.mock.lastCall?.[0].url).toBe(
      "http://localhost:3000/frag?q=1",
    );
  });
});

describe("makeSSRUrlFn", () => {
  it("should build a GET url with base and encoded query", () => {
    const ssrUrl = makeSSRUrlFn<TestSsr>("https://example.com/base");
    expect(ssrUrl("/frag", "GET", { q: "x y" })).toBe(
      "https://example.com/base/frag?q=x+y",
    );
  });

  it("should omit the query string when GET input is empty", () => {
    const ssrUrl = makeSSRUrlFn<TestSsr>("/base");
    expect(ssrUrl("/empty", "GET", {})).toBe("/base/empty");
  });

  it("should ignore input for non-GET methods (HTMX posts vals itself)", () => {
    const ssrUrl = makeSSRUrlFn<TestSsr>("/base");
    expect(ssrUrl("/frag", "POST", { name: "ann" })).toBe("/base/frag");
  });

  it("should default base to empty string when omitted", () => {
    const ssrUrl = makeSSRUrlFn<TestSsr>();
    expect(ssrUrl("/frag", "GET", { q: "1" })).toBe("/frag?q=1");
  });
});
