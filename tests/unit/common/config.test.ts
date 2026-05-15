import { describe, it, expect } from "bun:test";
import { buildConfig, type NoxtConfig } from "../../../src/core/config";

describe("buildConfig", () => {
  it("should return default config when no overrides provided", () => {
    const config = buildConfig({});
    expect(config.root).toBe(process.cwd());
    expect(config.pagesDir).toBe("src/pages");
    expect(config.islandsDir).toBe("src/islands");
    expect(config.assetsDir).toBe("src/assets");
  });

  it("should override default values with provided overrides", () => {
    const config = buildConfig({
      pagesDir: "custom/pages",
      islandsDir: "custom/islands",
    });
    expect(config.root).toBe(process.cwd());
    expect(config.pagesDir).toBe("custom/pages");
    expect(config.islandsDir).toBe("custom/islands");
    expect(config.assetsDir).toBe("src/assets");
  });

  it("should allow full override of all config values", () => {
    const config = buildConfig({
      root: "/custom/root",
      pagesDir: "/custom/pages",
      islandsDir: "/custom/islands",
      assetsDir: "/custom/assets",
    });
    expect(config.root).toBe("/custom/root");
    expect(config.pagesDir).toBe("/custom/pages");
    expect(config.islandsDir).toBe("/custom/islands");
    expect(config.assetsDir).toBe("/custom/assets");
  });

  it("should not mutate the original overrides object", () => {
    const overrides: Partial<NoxtConfig> = {
      pagesDir: "custom/pages",
    };
    buildConfig(overrides);
    expect(overrides.pagesDir).toBe("custom/pages");
    expect(overrides.root).toBeUndefined();
    expect(overrides.islandsDir).toBeUndefined();
    expect(overrides.assetsDir).toBeUndefined();
  });
});
