import { describe, expect, it } from "../../test-utils.ts";
import {
  HMR_ENDPOINT,
  HmrManager,
} from "../../../src/core/server";

describe("HmrManager", () => {
  it("injects the reload script before the closing body tag", async () => {
    const manager = new HmrManager();
    const routes = manager.wrapRoutes({
      "/": {
        GET: () =>
          new Response("<html><body>Page</body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
      },
    });

    const htmlResponse = await routes["/"]!.GET!(
      new Request("http://localhost/"),
    );
    expect(await htmlResponse.text()).toBe(
      `<html><body>Page<script>new EventSource("${HMR_ENDPOINT}").onmessage=()=>location.reload()</script></body></html>`,
    );
  });

  it("does not inject twice", async () => {
    const manager = new HmrManager();
    const routes = manager.wrapRoutes({
      "/": {
        GET: () =>
          new Response("<html><body>Page</body></html>", {
            headers: { "Content-Type": "text/html" },
          }),
      },
    });
    routes["/"]!.GET = manager.wrapRoutes(routes)["/"]!.GET!;

    const response = await routes["/"]!.GET!(
      new Request("http://localhost/"),
    );
    expect(await response.text()).toBe(
      `<html><body>Page<script>new EventSource("${HMR_ENDPOINT}").onmessage=()=>location.reload()</script></body></html>`,
    );
  });

  it("does not modify HTML without a body tag", async () => {
    const manager = new HmrManager();
    const routes = manager.wrapRoutes({
      "/": {
        GET: () =>
          new Response("<html><main>Page</main></html>", {
            headers: { "Content-Type": "text/html" },
          }),
      },
    });

    const response = await routes["/"]!.GET!(
      new Request("http://localhost/"),
    );
    expect(await response.text()).toBe("<html><main>Page</main></html>");
  });

  it("adds an SSE route and leaves API responses unchanged", async () => {
    const manager = new HmrManager();
    const routes = manager.wrapRoutes({
      "/api": {
        GET: () => new Response("{}", { status: 200 }),
      },
    });

    expect(routes[HMR_ENDPOINT]!.GET).toBeDefined();

    const apiResponse = await routes["/api"]!.GET!(
      new Request("http://localhost/api"),
    );
    expect(await apiResponse.text()).toBe("{}");
  });
});

