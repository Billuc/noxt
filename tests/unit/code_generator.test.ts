/**
 * Unit tests for src/core/code_generator.ts
 */
import { generateRouteMapCode } from "../../src/core/code_generator";
import { describe, it, expect } from "bun:test";

describe("generateRouteMapCode", () => {
  it("should generate code with single route", () => {
    const manifest = { "/": "./index.html" };
    const result = generateRouteMapCode(manifest);
    expect(result).toEqualIgnoringWhitespace(`
      import _ from "./index.html";

      export default {
        "/": _
      };
    `);
  });

  it("should generate code with multiple routes", () => {
    const manifest = { "/": "./index.html", "/about": "./about.html" };
    const result = generateRouteMapCode(manifest);
    expect(result).toEqualIgnoringWhitespace(`
      import _ from "./index.html";
      import _about from "./about.html";

      export default {
        "/": _,
        "/about": _about
      };
    `);
  });

  it("should sanitize route names with special characters", () => {
    const manifest = { "/about-us": "./about-us.html" };
    const result = generateRouteMapCode(manifest);
    expect(result).toEqualIgnoringWhitespace(`
      import _about_us from "./about-us.html";

      export default {
        "/about-us": _about_us
      };
    `);
  });

  it("should return empty object for empty manifest", () => {
    const manifest = {};
    const result = generateRouteMapCode(manifest);
    expect(result).toEqualIgnoringWhitespace(`
      export default {
      };
    `);
  });
});
