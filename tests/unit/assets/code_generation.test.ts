/**
 * Unit tests for src/core/code_generator.ts
 */
import { generateAssetUtilsCode } from "../../../src/assets/code_generation";
import { describe, it, expect } from "bun:test";

describe("generateAssetUtilsCode", () => {
  it("should generate code with a single asset", () => {
    const result = generateAssetUtilsCode(["/image.png"]);
    expect(result).toContain('type AssetId = "/image.png";');
    expect(result).toContain("function asset(id: AssetId): string");
    expect(result).toContain("return id;");
    expect(result).toContain("export { asset, type AssetId }");
  });

  it("should generate code with multiple assets", () => {
    const result = generateAssetUtilsCode(["/image.png", "/style.css"]);
    expect(result).toContain('type AssetId = "/image.png" | "/style.css";');
  });

  it("should handle empty asset list", () => {
    const result = generateAssetUtilsCode([]);
    expect(result).toContain("type AssetId = never;");
    expect(result).toContain("function asset(id: AssetId): string");
  });
});
