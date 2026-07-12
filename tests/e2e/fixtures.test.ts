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
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { rm, readdir, readFile } from "node:fs/promises";

const FIXTURES_DIR = path.resolve("tests/fixtures");
const DIST_DIR = path.resolve(FIXTURES_DIR, "dist");
const CACHE_DIR = path.resolve(FIXTURES_DIR, ".cache");
const ROUTES_FILE = path.resolve(FIXTURES_DIR, ".cache", "routes.json");

async function cleanupFixtures() {
  await rm(DIST_DIR, { recursive: true, force: true }).catch(() => {});
  await rm(CACHE_DIR, { recursive: true, force: true }).catch(() => {});
}

describe("fixtures project - two-step build workflow", () => {
  beforeEach(async () => {
    await cleanupFixtures();
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  describe("generate command (bun run build.ts)", () => {
    it("should exit successfully", async () => {
      const cmd = Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      });
      await cmd.exited;
      expect(cmd.exitCode).toBe(0);
    });

    it("should generate .cache directory with HTML files", async () => {
      const cmd = Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      });
      await cmd.exited;

      const cacheFiles = await readdir(CACHE_DIR);
      const htmlFiles = cacheFiles.filter((f) => f.endsWith(".html"));
      expect(htmlFiles.length).toBeGreaterThanOrEqual(6);
    });

    it("should generate routes.json in .cache directory", async () => {
      await Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      }).exited;

      const routesContent = await readFile(ROUTES_FILE, "utf-8");
      const parsed = JSON.parse(routesContent);
      expect(parsed).toHaveProperty("/");
      expect(parsed).toHaveProperty("/sample");
    });

    it("should generate routes.json with page and asset entries", async () => {
      await Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      }).exited;

      const routesContent = await readFile(ROUTES_FILE, "utf-8");
      const parsed = JSON.parse(routesContent);
      expect(parsed["/"]).toMatch(/\.cache[/\\].+\.html$/);
      expect(parsed["/assets/test.png"]).toMatch(
        /^assets[/\\]test\.png$/,
      );
    });

    it("should generate unique hashes across pages", async () => {
      await Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      }).exited;

      const cacheFiles = await readdir(CACHE_DIR);
      const htmlFiles = cacheFiles.filter((f) => f.endsWith(".html"));
      const hashes = htmlFiles.map((f) => f.split(".")[1]);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    });
  });

  describe("bundle command (bun build --target=bun --outdir=dist index.ts)", () => {
    beforeEach(async () => {
      await Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      }).exited;
    });

    it("should exit successfully", async () => {
      const cmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      const stderrReader = (async () => {
        const chunks: Buffer[] = [];
        for await (const chunk of cmd.stderr) {
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString();
      })();
      const exitCode = await cmd.exited;
      expect(exitCode).toBe(0);
      const stderr = await stderrReader;
      if (stderr.includes("error")) expect(stderr).not.toContain("error");
    });

    it("should generate index.js in dist directory", async () => {
      const cmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR },
      );
      await cmd.exited;

      const files = await readdir(DIST_DIR);
      expect(files).toContain("index.js");
    });

    it("should contain route map with all page paths in output", async () => {
      await Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR },
      ).exited;

      const content = await readFile(
        path.resolve(DIST_DIR, "index.js"),
        "utf-8",
      );
      expect(content).toContain('"/"');
      expect(content).toContain('"/sample"');
      expect(content).toContain('"/sample2"');
      expect(content).toContain('"/markdown"');
      expect(content).toContain('"/page_with_island"');
      expect(content).toContain('"/nested/post1"');
    });

    it("should contain Bun.serve with routes", async () => {
      await Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR },
      ).exited;

      const content = await readFile(
        path.resolve(DIST_DIR, "index.js"),
        "utf-8",
      );
      expect(content).toContain("Bun.serve");
      expect(content).toContain("routes");
    });
  });

  describe("server (bun run index.ts)", () => {
    let serverProcess: Bun.Subprocess | null = null;
    const TEST_PORT = 2101;

    beforeEach(async () => {
      await Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      }).exited;
    });

    afterEach(async () => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      await Bun.sleep(200);
    });

    it("should respond to / with index page", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("Index Page");
    });

    it("should respond to /sample", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/sample`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("Sample Page");
    });

    it("should respond to /sample2", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/sample2`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("Another sample Page");
    });

    it("should respond to /markdown", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/markdown`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("Markdown page");
    });

    it("should respond to /page_with_island", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
      });
      await Bun.sleep(300);

      const response = await fetch(
        `http://localhost:${TEST_PORT}/page_with_island`,
      );
      expect(response.status).toBe(200);
    });

    it("should return 404 for unknown paths", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/nonexistent`);
      expect(response.status).toBe(404);
    });
  });

  describe("build and run integration", () => {
    let serverProcess: Bun.Subprocess | null = null;

    afterEach(async () => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      await Bun.sleep(200);
    });

    it("should build then bundle then serve successfully", async () => {
      const buildCmd = Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      });
      await buildCmd.exited;
      expect(buildCmd.exitCode).toBe(0);

      const bundleCmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR },
      );
      await bundleCmd.exited;
      expect(bundleCmd.exitCode).toBe(0);

      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:2101/`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("Index Page");
    });

    it("should generate consistent output across rebuilds", async () => {
      await Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      }).exited;
      const firstRun = await readdir(CACHE_DIR).then((files) =>
        files.filter((f) => f.endsWith(".html")).sort(),
      );

      await cleanupFixtures();

      await Bun.spawn(["bun", "run", "build.ts"], {
        cwd: FIXTURES_DIR,
      }).exited;
      const secondRun = await readdir(CACHE_DIR).then((files) =>
        files.filter((f) => f.endsWith(".html")).sort(),
      );

      expect(firstRun.length).toBe(secondRun.length);
      expect(firstRun).toEqual(secondRun);
    });
  });
});
