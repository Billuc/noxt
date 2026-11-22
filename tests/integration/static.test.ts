import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  mkdir,
  rm,
  writeFile,
  readFile,
} from "node:fs/promises";
import path from "node:path";
import { generateStaticPages } from "../../src/static/build";
import { Path } from "../../src/core/fs";
import type { IslandEntry } from "../../src/islands";
import type { AssetEntry } from "../../src/assets/types";

const TEST_DIR = path.join(import.meta.dirname, "test-static-project");
const originalCwd = process.cwd();

async function setupTestProject() {
  await mkdir(path.join(TEST_DIR, "src", "pages"), { recursive: true });
  await mkdir(path.join(TEST_DIR, ".cache", "_islands"), {
    recursive: true,
  });
  await mkdir(path.join(TEST_DIR, "src", "assets", "images"), {
    recursive: true,
  });
  await writeFile(
    path.join(TEST_DIR, "src", "pages", "index.html"),
    "<h1>Home</h1>",
  );
  await writeFile(
    path.join(TEST_DIR, "src", "pages", "about.html"),
    "<h1>About</h1>",
  );
  await writeFile(
    path.join(TEST_DIR, ".cache", "_islands", "Counter.js"),
    "counter",
  );
  await writeFile(
    path.join(TEST_DIR, "src", "assets", "images", "logo.svg"),
    "<svg></svg>",
  );
}

describe("generateStaticPages", () => {
  beforeEach(async () => {
    process.chdir(originalCwd);
    await rm(TEST_DIR, { recursive: true, force: true });
    await setupTestProject();
    process.chdir(TEST_DIR);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it("copies pages, islands, and assets into dist and creates a manifest", async () => {
    const island = {
      hash: "counter",
      component: () => null,
      files: [
        Path.fromAbsolute(
          path.join(TEST_DIR, ".cache", "_islands", "Counter.js"),
        ),
      ],
    } satisfies IslandEntry;
    const asset = {
      url: "/assets/images/logo.svg",
      file: Path.fromAbsolute(
        path.join(TEST_DIR, "src", "assets", "images", "logo.svg"),
      ),
    } satisfies AssetEntry;

    const { manifest } = await generateStaticPages({
      pages: [
        {
          url: "/",
          file: Path.fromAbsolute(
            path.join(TEST_DIR, "src", "pages", "index.html"),
          ),
        },
        {
          url: "/about",
          file: Path.fromAbsolute(
            path.join(TEST_DIR, "src", "pages", "about.html"),
          ),
        },
      ],
      islands: [island],
      assets: [asset],
      base: "/docs",
    });

    expect(
      (await readFile(path.join(TEST_DIR, "dist", "index.html"))).toString(),
    ).toBe("<h1>Home</h1>");
    expect(
      (
        await readFile(
          path.join(TEST_DIR, "dist", "about", "index.html"),
        )
      ).toString(),
    ).toBe("<h1>About</h1>");
    expect(
      (
        await readFile(
          path.join(TEST_DIR, "dist", "_islands", "Counter.js"),
        )
      ).toString(),
    ).toBe("counter");
    expect(
      (
        await readFile(
          path.join(TEST_DIR, "dist", "assets", "images", "logo.svg"),
        )
      ).toString(),
    ).toBe("<svg></svg>");

    expect(manifest).toEqual({
      "/docs/": path.join("dist", "index.html"),
      "/docs/about": path.join("dist", "about", "index.html"),
      "/docs/_islands/Counter.js": path.join(
        "dist",
        "_islands",
        "Counter.js",
      ),
      "/docs/assets/images/logo.svg": path.join(
        "dist",
        "assets",
        "images",
        "logo.svg",
      ),
    });
  });
});
