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
import { useIsland } from "../../src/shell/build";
import { setIslandMap, type IslandEntry } from "../../src/core/registry";
import { describe, it, expect, beforeEach } from "bun:test";
import { h } from "preact";
import renderToString from "preact-render-to-string";
import * as devalue from "devalue";
import { RelativePath } from "../../src/core/fs";

interface TestProps {
  name: string;
  count?: number;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

describe("useIsland", () => {
  beforeEach(() => {
    setIslandMap([]);
  });

  it("should return a wrapper component", () => {
    const TestComponent = ({ name }: TestProps) =>
      h("div", { class: "test" }, name);

    const entry: IslandEntry = {
      component: TestComponent,
      hash: "testhash123",
      path: RelativePath.fromCwd("test.js"),
      publicPath: "/.cache/testhash123.js",
    };
    setIslandMap([entry]);

    const Wrapper = useIsland(TestComponent);
    expect(Wrapper).toBeDefined();
    expect(typeof Wrapper).toBe("function");
  });

  it("should render div with data-island attribute", () => {
    const TestComponent = ({ name }: TestProps) =>
      h("div", { class: "test" }, name);

    const entry: IslandEntry = {
      component: TestComponent,
      hash: "testhash456",
      path: RelativePath.fromCwd("test.js"),
      publicPath: "/.cache/testhash456.js",
    };
    setIslandMap([entry]);

    const Wrapper = useIsland(TestComponent);
    const html = renderToString(h(Wrapper, { name: "World" }));

    expect(html).toContain('data-island="testhash456"');
  });

  it("should include serialized props in data-props attribute", () => {
    const TestComponent = ({ name, count }: TestProps) =>
      h("div", {}, `${name}: ${count}`);

    const entry: IslandEntry = {
      component: TestComponent,
      hash: "hashprops",
      path: RelativePath.fromCwd("test.js"),
      publicPath: "/.cache/hashprops.js",
    };
    setIslandMap([entry]);

    const Wrapper = useIsland(TestComponent);
    const html = renderToString(h(Wrapper, { name: "Test", count: 42 }));

    expect(html).toContain("data-props=");
    const propsMatch = html.match(/data-props="([^"]*)"/);
    expect(propsMatch).not.toBeNull();

    const decodedProps = decodeHtmlEntities(propsMatch![1]!);
    const parsedProps = devalue.parse(decodedProps);
    expect(parsedProps.name).toBe("Test");
    expect(parsedProps.count).toBe(42);
  });

  it("should include script tag with src pointing to publicPath", () => {
    const TestComponent = (_: TestProps) => h("div", {}, "test");

    const entry: IslandEntry = {
      component: TestComponent,
      hash: "scripttest",
      path: RelativePath.fromCwd("test.js"),
      publicPath: "/.cache/scripttest.js",
    };
    setIslandMap([entry]);

    const Wrapper = useIsland(TestComponent);
    const html = renderToString(h(Wrapper, { name: "ScriptTest" }));

    expect(html).toContain('<script src="/.cache/scripttest.js"');
  });

  it("should throw for an unprerendered component", () => {
    const UnknownComponent = () => h("div", {}, "unknown");
    expect(() => useIsland(UnknownComponent)).toThrow("not been prerendered");
  });

  it("should handle empty props object", () => {
    const TestComponent = (_: TestProps) => h("div", {}, "empty");

    const entry: IslandEntry = {
      component: TestComponent,
      hash: "emptyprops",
      path: RelativePath.fromCwd("test.js"),
      publicPath: "/.cache/emptyprops.js",
    };
    setIslandMap([entry]);

    const Wrapper = useIsland(TestComponent);
    // @ts-expect-error - intentionally passing no props
    const html = renderToString(h(Wrapper, {}));

    // devalue wraps empty props in an array: [{}]
    expect(html).toContain('data-props="[{}]"');
  });
});
