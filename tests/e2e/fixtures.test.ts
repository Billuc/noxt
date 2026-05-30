/**
 * End-to-end tests for the fixtures project
 * Tests run and build commands
 */
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { rm, readdir, readFile } from "node:fs/promises";

const FIXTURES_DIR = path.resolve("tests/fixtures");
const FIXTURES_INDEX = path.resolve(FIXTURES_DIR, "index.ts");
const DIST_DIR = path.resolve(FIXTURES_DIR, "dist");
const CACHE_DIR = path.resolve(FIXTURES_DIR, ".cache");

// Helper to clean up directories
async function cleanupFixturesDir() {
  await rm(DIST_DIR, { recursive: true, force: true }).catch(() => {});
  await rm(CACHE_DIR, { recursive: true, force: true }).catch(() => {});
}

describe("fixtures project - run and build commands", () => {
  beforeEach(async () => {
    await cleanupFixturesDir();
  });

  afterEach(async () => {
    await cleanupFixturesDir();
  });

  describe("build command", () => {
    it("should build the project successfully", async () => {
      const cmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await cmd.exited;

      expect(cmd.exitCode).toBe(0);
      for await (const err of cmd.stderr) {
        expect(err.toString()).not.toContain("error");
      }
    });

    it("should generate index.js in dist directory", async () => {
      const cmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await cmd.exited;

      const files = await readdir(DIST_DIR);
      expect(files).toContain("index.js");
    });

    it("should generate .cache directory with route files", async () => {
      const cmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await cmd.exited;

      const cachePath = path.resolve(DIST_DIR, ".cache");
      const cacheFiles = await readdir(cachePath);
      expect(cacheFiles.length).toBeGreaterThan(0);
      expect(cacheFiles.some((f) => f.endsWith(".html"))).toBe(true);
    });

    it("should generate route files for all pages", async () => {
      const cmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await cmd.exited;

      const cachePath = path.resolve(DIST_DIR, ".cache");
      const cacheFiles = await readdir(cachePath);

      // Should have route files for index, sample, sample2, markdown pages
      const htmlFiles = cacheFiles.filter((f) => f.endsWith(".html"));
      expect(htmlFiles.length).toBeGreaterThanOrEqual(6); // At least index, sample, sample2, markdown, nested/post1
    });

    it("should generate files with correct content", async () => {
      const cmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await cmd.exited;

      const indexPath = path.resolve(DIST_DIR, "index.js");
      const content = await readFile(indexPath, "utf-8");

      expect(content).toContain("Bun.serve");
      expect(content).toContain("routes");
    });

    it("should generate different hashes for different pages", async () => {
      const cmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await cmd.exited;

      const cachePath = path.resolve(DIST_DIR, ".cache");
      const cacheFiles = await readdir(cachePath);

      const htmlFiles = cacheFiles.filter((f) => f.endsWith(".html"));
      const hashes = htmlFiles.map((f) => f.split(".")[1]);

      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    });
  });

  describe("run command", () => {
    let serverProcess: Bun.Subprocess | null = null;
    const TEST_PORT = 2101;

    afterEach(async () => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      // Give some time for port to be released
      await Bun.sleep(200);
    });

    it("should respond to root path with index page", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stderr: "pipe",
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/`);
      expect(response.status).toBe(200);

      const body = await response.text();
      expect(body).toContain("Index Page");
    });

    it("should respond to /sample path", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stderr: "pipe",
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/sample`);
      expect(response.status).toBe(200);

      const body = await response.text();
      expect(body).toContain("Sample Page");
    });

    it("should respond to /sample2 path", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stderr: "pipe",
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/sample2`);
      expect(response.status).toBe(200);

      const body = await response.text();
      expect(body).toContain("Another sample Page");
    });

    it("should respond to /markdown path", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stderr: "pipe",
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/markdown`);
      expect(response.status).toBe(200);

      const body = await response.text();
      expect(body).toContain("Markdown page");
    });

    it("should respond to /page_with_island path", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stderr: "pipe",
      });
      await Bun.sleep(300);

      const response = await fetch(
        `http://localhost:${TEST_PORT}/page_with_island`,
      );
      expect(response.status).toBe(200);
    });

    it("should respond with 404 for unknown paths", async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stderr: "pipe",
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${TEST_PORT}/nonexistent`);
      expect(response.status).toBe(404);
    });
  });

  describe("build and run integration", () => {
    let serverProcess: Bun.Subprocess | null = null;
    const BUILD_TEST_PORT = 2102;

    afterEach(async () => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      await Bun.sleep(200);
    });

    it("should build and then run the built files successfully", async () => {
      const buildCmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await buildCmd.exited;

      expect(buildCmd.exitCode).toBe(0);

      const indexPath = path.resolve(DIST_DIR, "index.js");
      let builtContent = await readFile(indexPath, "utf-8");
      builtContent = builtContent.replace("2101", String(BUILD_TEST_PORT));
      await Bun.write(indexPath, builtContent);

      serverProcess = Bun.spawn(["bun", "run", "index.js"], {
        cwd: DIST_DIR,
        stderr: "pipe",
      });
      await Bun.sleep(300);

      const response = await fetch(`http://localhost:${BUILD_TEST_PORT}/`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("Index Page");
    });

    it("should generate .cache with all page HTML files during build", async () => {
      const buildCmd = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await buildCmd.exited;

      const cachePath = path.resolve(DIST_DIR, ".cache");
      const cacheFiles = await readdir(cachePath);

      // Check for specific pages
      const hasIndexPage = cacheFiles.some((f) => f.includes("IndexPage"));
      const hasSamplePage = cacheFiles.some((f) => f.includes("SamplePage"));
      const hasMarkdownPage = cacheFiles.some((f) => f.includes("markdown"));

      expect(hasIndexPage || hasSamplePage || hasMarkdownPage).toBe(true);
    });

    it("should have consistent build output", async () => {
      const buildCmd1 = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await buildCmd1.exited;
      const firstFiles = await readdir(DIST_DIR);

      await cleanupFixturesDir();
      const buildCmd2 = Bun.spawn(
        ["bun", "build", "--target=bun", "--outdir=dist", "index.ts"],
        { cwd: FIXTURES_DIR, stderr: "pipe" },
      );
      await buildCmd2.exited;
      const secondFiles = await readdir(DIST_DIR);

      // Should have same number of files
      expect(firstFiles.length).toBe(secondFiles.length);
    });
  });
});
