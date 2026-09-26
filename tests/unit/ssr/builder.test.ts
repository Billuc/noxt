import { describe, it, expect } from "bun:test";
import * as s from "superstruct";
import * as devalue from "devalue";
import { h } from "preact";
import { query, mutation } from "../../../src/ssr/builder";
import { SSRRoute } from "../../../src/ssr/types";

describe("ssr builder query()", () => {
  it("creates an SSRRoute with input schema", () => {
    const route = query()
      .input(s.object({ name: s.string() }))
      .route(() => h("div", {}, "hi"));

    expect(route).toBeInstanceOf(SSRRoute);
  });

  it("renders handler result as HTML with 200 + html content-type", async () => {
    const route = query()
      .input(s.object({ name: s.string() }))
      .route(({ input }) => h("div", {}, `Hello, ${input.name}!`));

    const res = await route.handler(
      new Request("http://localhost/page?name=John"),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("html");
    expect(await res.text()).toBe("<div>Hello, John!</div>");
  });

  it("returns 400 for invalid search params", async () => {
    const route = query()
      .input(s.object({ name: s.string() }))
      .route(() => h("div", {}, "hi"));

    const res = await route.handler(new Request("http://localhost/page"));

    expect(res.status).toBe(400);
  });

  it("returns 500 when handler throws", async () => {
    const route = query()
      .input(s.object({}))
      .route(() => {
        throw new Error("boom");
      });

    const res = await route.handler(new Request("http://localhost/page"));

    expect(res.status).toBe(500);
  });
});

describe("ssr builder mutation()", () => {
  it("parses devalue body and renders HTML", async () => {
    const route = mutation()
      .input(s.object({ name: s.string() }))
      .route(({ input }) => h("span", {}, `Created ${input.name}`));

    const res = await route.handler(
      new Request("http://localhost/page", {
        method: "POST",
        body: devalue.stringify({ name: "John" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<span>Created John</span>");
  });

  it("returns 400 for invalid body", async () => {
    const route = mutation()
      .input(s.object({ name: s.string() }))
      .route(() => h("div", {}, "hi"));

    const res = await route.handler(
      new Request("http://localhost/page", {
        method: "POST",
        body: "not valid !!!",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for body with the wrong format", async () => {
    const route = mutation()
      .input(s.object({ name: s.string() }))
      .route(() => h("div", {}, "hi"));

    const res = await route.handler(
      new Request("http://localhost/page", {
        method: "POST",
        body: devalue.stringify({ foo: "bar" }),
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 500 when handler throws", async () => {
    const route = mutation()
      .input(s.object({ name: s.string() }))
      .route(() => {
        throw new Error("boom");
      });

    const res = await route.handler(
      new Request("http://localhost/page", {
        method: "POST",
        body: devalue.stringify({ name: "John" }),
      }),
    );

    expect(res.status).toBe(500);
  });
});
