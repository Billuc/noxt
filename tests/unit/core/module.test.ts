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
      expect(warnSpy).toHaveBeenCalledWith(
        `Module "${modulePath}" has unexpected exports (helper). Intended exports: GET, POST.`,
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

  it("throws with the module path and the original error as cause", async () => {
    const modulePath = path.join(TEST_DIR, "does-not-exist.ts");

    const error = await importModule(modulePath, ["default"]).catch(
      (err: Error) => err,
    );

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      `Failed to import module "${modulePath}".`,
    );
    expect((error as Error).cause).toBeDefined();
  });
});
