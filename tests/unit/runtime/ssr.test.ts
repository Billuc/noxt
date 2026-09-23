import { describe, it, expect } from "bun:test";
import * as s from "superstruct";
import { getSSRHandlers } from "../../../src/runtime/ssr";
import { SSRRoute } from "../../../src/ssr/types";
import { h } from "preact";

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
