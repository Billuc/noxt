/**
 * Unit tests for src/preact/render.ts
 */
import { renderPreactToHtml } from "../../../src/preact/render";
import { Island } from "../../../src/islands";
import { describe, it, expect } from "bun:test";
import { h, Fragment } from "preact";
import { UtilsContext } from "../../../src/core/context";
import { useContext } from "preact/hooks";

describe("renderPreactToHtml", () => {
  it("should render a simple component to full HTML with DOCTYPE", async () => {
    const Component = () =>
      h("html", {}, [h("body", {}, h("h1", {}, "Hello World"))]);
    const result = await renderPreactToHtml(Component);
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <body><h1>Hello World</h1></body>
        </html>`,
    );
  });

  it("should render nested components", async () => {
    const Child = () => h("span", {}, "Child");
    const Parent = () => h("div", {}, [h("h1", {}, "Parent"), h(Child, {})]);
    const Layout = () => h("html", {}, [h("body", {}, h(Parent, {}))]);
    const result = await renderPreactToHtml(Layout);
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <body>
            <div>
              <h1>Parent</h1>
              <span>Child</span>
            </div>
          </body>
        </html>`,
    );
  });

  it("should render a component that returns null", async () => {
    const Component = () => null;
    const result = await renderPreactToHtml(Component);
    expect(result).toEqualIgnoringWhitespace(``);
  });

  it("should render a component that returns a string", async () => {
    const Component = () => "<foo>bar</foo>";
    const result = await renderPreactToHtml(Component);
    expect(result).toEqualIgnoringWhitespace(`<foo>bar</foo>`);
  });

  it("should render a component with props", async () => {
    const Greeting = ({ name }: { name: string }) =>
      h("h1", {}, `Hello ${name}`);
    const result = await renderPreactToHtml(() =>
      h(Greeting, { name: "World" }),
    );
    expect(result).toContain("Hello World");
  });

  it("should provide page and asset utils to components", async () => {
    const Component = () => {
      const { page, asset } = useContext(UtilsContext);
      return h("div", {}, `${page("/about")} ${asset("/img.png")}`);
    };
    const result = await renderPreactToHtml(
      Component,
      "/base",
      undefined,
      (assetId) => "/base" + assetId,
      (pageId) => "/base" + pageId,
    );
    expect(result).toContain("<div>/base/about /base/img.png</div>");
  });

  it("should throw when using page utils without a provided page function", async () => {
    const Component = () => {
      const { page } = useContext(UtilsContext);
      return h("div", {}, page("/about"));
    };
    await expect(renderPreactToHtml(Component)).rejects.toThrow(
      "No page function has been provided",
    );
  });

  it("should fall back to client-only for islands that throw during prerendering", async () => {
    const ThrowingIsland = () => {
      if (typeof window === "undefined") {
        throw new Error("browser-only feature");
      }
      return h("div", {}, "client content");
    };
    const HealthyIsland = () => h("div", {}, "server content");

    const islandEntries = [
      { component: ThrowingIsland, hash: "throwing", files: [] },
      { component: HealthyIsland, hash: "healthy", files: [] },
    ];

    const Page = () =>
      h(Fragment, {}, [
        h(Island, { component: ThrowingIsland, props: {} }),
        h(Island, { component: HealthyIsland, props: {} }),
      ]);

    const result = await renderPreactToHtml(Page, undefined, islandEntries);

    expect(result).toContain('data-island="throwing"');
    expect(result).not.toContain("client content");
    expect(result).toContain('data-island="healthy"');
    expect(result).toContain("server content");
  });
});
