/**
 * Unit tests for src/preact/render.ts
 */
import { renderPreactToHtml } from "../../../src/preact/render";
import { describe, it, expect } from "bun:test";
import { h } from "preact";
import { BaseContext } from "../../../src/core/context";
import { useContext } from "preact/hooks";

describe("renderPreactToHtml", () => {
  it("should render a simple component to full HTML with DOCTYPE", async () => {
    const Component = () => h("h1", {}, "Hello World");
    const result = await renderPreactToHtml(Component);
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <head></head>
          <body><h1>Hello World</h1></body>
        </html>`,
    );
  });

  it("should render nested components", async () => {
    const Child = () => h("span", {}, "Child");
    const Parent = () => h("div", {}, [h("h1", {}, "Parent"), h(Child, {})]);
    const result = await renderPreactToHtml(Parent);
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <head></head>
          <body><div><h1>Parent</h1><span>Child</span></div></body>
        </html>`,
    );
  });

  it("should render a component that returns null", async () => {
    const Component = () => null;
    const result = await renderPreactToHtml(Component);
    expect(result).toEqualIgnoringWhitespace(
      `<!DOCTYPE html>
        <html>
          <head></head>
          <body></body>
        </html>`,
    );
  });

  it("should render a component with props", async () => {
    const Greeting = ({ name }: { name: string }) =>
      h("h1", {}, `Hello ${name}`);
    const result = await renderPreactToHtml(() =>
      h(Greeting, { name: "World" }),
    );
    expect(result).toContain("Hello World");
  });

  it("should pass base parameter", async () => {
    const Component = () => {
      const base = useContext(BaseContext);
      return h("div", {}, base);
    };
    const result = await renderPreactToHtml(Component, "/base");
    expect(result).toContain("<div>/base</div>");
  });
});
