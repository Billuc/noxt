/**
 * Unit tests for src/core/server.ts
 */
import { serverRender } from "../../src/core/server";
import { describe, it, expect } from "bun:test";
import { h, type ComponentType } from "preact";

describe("serverRender", () => {
  it("should return a Response object", async () => {
    const Component: ComponentType<{ title: string }> = ({ title }) =>
      h("h1", {}, title);
    const response = await serverRender(Component, { title: "Test" });
    expect(response).toBeInstanceOf(Response);
  });

  it("should return response with status 200", async () => {
    const Component = () => h("div", {}, "Hello");
    const response = await serverRender(Component, {});
    expect(response.status).toBe(200);
  });

  it("should return response with Content-Type text/html", async () => {
    const Component = () => h("div", {}, "Hello");
    const response = await serverRender(Component, {});
    expect(response.headers.get("Content-Type")).toBe("text/html");
  });

  it("should render component to HTML", async () => {
    const Component = () => h("h1", {}, "Hello World");
    const response = await serverRender(Component, {});
    const body = await response.text();
    expect(body).toContain("Hello World");
  });

  it("should pass props to component", async () => {
    const Component: ComponentType<{ title: string }> = ({ title }) =>
      h("h1", {}, title);
    const response = await serverRender(Component, { title: "Custom Title" });
    const body = await response.text();
    expect(body).toContain("Custom Title");
  });

  it("should render nested components", async () => {
    const Child = () => h("span", {}, "Child");
    const Parent = () => h("div", {}, [h("h1", {}, "Parent"), h(Child, {})]);
    const response = await serverRender(Parent, {});
    const body = await response.text();
    expect(body).toContain("Parent");
    expect(body).toContain("Child");
  });

  it("should render component with attributes", async () => {
    const Component: ComponentType<{ className?: string }> = ({ className }) =>
      h("div", { className }, "Content");
    const response = await serverRender(Component, { className: "test-class" });
    const body = await response.text();
    expect(body).toContain('class="test-class"');
  });

  it("should handle empty component", async () => {
    const Component = () => null;
    const response = await serverRender(Component, {});
    const body = await response.text();
    expect(body).toBe("");
  });

  it("should ignore children props", async () => {
    const Component: ComponentType<{ children?: string }> = ({ children }) =>
      h("div", {}, children);
    const response = await serverRender(Component, {
      children: "Nested content",
    });
    const body = await response.text();
    expect(body).toBe("<div></div>");
  });

  it("should merge additional attributes with props", async () => {
    const Component: ComponentType<{ title: string }> = ({ title, ...rest }) =>
      h("div", rest, title);
    const response = await serverRender(Component, {
      title: "Test",
      id: "my-id",
    } as any);
    const body = await response.text();
    expect(body).toContain('id="my-id"');
  });
});
