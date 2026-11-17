import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { importModule } from "../../../src/core/module";

const TEST_DIR = path.join(import.meta.dir, "test-module-temp");

describe("importModule", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("warns about exports outside the intended set", async () => {
    const modulePath = path.join(TEST_DIR, "valid.ts");
    await writeFile(
      modulePath,
      "export const GET = true;\nexport const helper = true;\n",
    );
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    try {
      const imported = await importModule(modulePath, ["GET", "POST"]);

      expect(imported).not.toBeNull();
      expect(warnSpy.mock.calls.flat().join(" ")).toContain("helper");
      expect(warnSpy.mock.calls.flat().join(" ")).toContain(
        "Intended exports: GET, POST",
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("logs an error and returns null when no intended export is present", async () => {
    const modulePath = path.join(TEST_DIR, "missing-export.ts");
    await writeFile(modulePath, "export const helper = true;\n");
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    try {
      expect(await importModule(modulePath, ["GET", "POST"])).toBeNull();
      expect(errorSpy.mock.calls.flat().join(" ")).toContain(
        "Actual exports: helper",
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("logs import failures with the module path", async () => {
    const modulePath = path.join(TEST_DIR, "does-not-exist.ts");
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});

    try {
      expect(await importModule(modulePath, ["default"])).toBeNull();
      expect(errorSpy.mock.calls.flat().join(" ")).toContain(modulePath);
      expect(errorSpy.mock.calls.flat().join(" ")).toContain(
        "Failed to import module",
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
