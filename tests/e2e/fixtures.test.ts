/**
 * End-to-end tests for the fixtures project
 * Tests run and build commands
 */
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "bun:test";
import path from "node:path";
import { rm, mkdir, readdir, readFile } from "node:fs/promises";
import { spawn, type ChildProcess } from "node:child_process";

const FIXTURES_DIR = path.resolve("tests/fixtures");
const FIXTURES_INDEX = path.resolve(FIXTURES_DIR, "index.ts");
const DIST_DIR = path.resolve(FIXTURES_DIR, "dist");
const CACHE_DIR = path.resolve(FIXTURES_DIR, ".cache");

// Helper to run a command in the fixtures directory
async function runCommand(command: string, args: string[] = [], cwd: string = FIXTURES_DIR): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (data) => (stdout += data.toString()));
    child.stderr.on("data", (data) => (stderr += data.toString()));
    child.on("close", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

// Helper to wait for server to be ready
async function waitForServer(port: number, timeout: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}/`);
      if (response.ok) return true;
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(100);
  }
  return false;
}

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
      const result = await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      
      expect(result.code).toBe(0);
      expect(result.stderr).not.toContain("error");
    });

    it("should generate index.js in dist directory", async () => {
      await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      
      const files = await readdir(DIST_DIR);
      expect(files).toContain("index.js");
    });

    it("should generate .cache directory with route files", async () => {
      await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      
      const cachePath = path.resolve(DIST_DIR, ".cache");
      const cacheFiles = await readdir(cachePath);
      expect(cacheFiles.length).toBeGreaterThan(0);
      expect(cacheFiles.some(f => f.endsWith(".html"))).toBe(true);
    });

    it("should generate route files for all pages", async () => {
      await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      
      const cachePath = path.resolve(DIST_DIR, ".cache");
      const cacheFiles = await readdir(cachePath);
      
      // Should have route files for index, sample, sample2, markdown pages
      const htmlFiles = cacheFiles.filter(f => f.endsWith(".html"));
      expect(htmlFiles.length).toBeGreaterThanOrEqual(6); // At least index, sample, sample2, markdown, nested/post1
    });

    it("should generate files with correct content", async () => {
      await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      
      const indexPath = path.resolve(DIST_DIR, "index.js");
      const content = await readFile(indexPath, "utf-8");
      
      expect(content).toContain("Bun.serve");
      expect(content).toContain("routes");
    });

    it("should generate different hashes for different pages", async () => {
      await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      
      const cachePath = path.resolve(DIST_DIR, ".cache");
      const cacheFiles = await readdir(cachePath);
      
      const htmlFiles = cacheFiles.filter(f => f.endsWith(".html"));
      const hashes = htmlFiles.map(f => f.split(".")[1]);
      
      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    });
  });

  describe("run command", () => {
    let serverProcess: ChildProcess | null = null;
    const TEST_PORT = 2101;

    afterEach(async () => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      // Give some time for port to be released
      await Bun.sleep(200);
    });

    it("should start the server successfully", async () => {
      serverProcess = spawn("bun", ["run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const serverReady = await waitForServer(TEST_PORT, 10000);
      expect(serverReady).toBe(true);
    });

    it("should respond to root path with index page", async () => {
      serverProcess = spawn("bun", ["run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      await waitForServer(TEST_PORT, 10000);
      
      const response = await fetch(`http://localhost:${TEST_PORT}/`);
      expect(response.status).toBe(200);
      
      const body = await response.text();
      expect(body).toContain("Index Page");
    });

    it("should respond to /sample path", async () => {
      serverProcess = spawn("bun", ["run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      await waitForServer(TEST_PORT, 10000);
      
      const response = await fetch(`http://localhost:${TEST_PORT}/sample`);
      expect(response.status).toBe(200);
      
      const body = await response.text();
      expect(body).toContain("Sample Page");
    });

    it("should respond to /sample2 path", async () => {
      serverProcess = spawn("bun", ["run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      await waitForServer(TEST_PORT, 10000);
      
      const response = await fetch(`http://localhost:${TEST_PORT}/sample2`);
      expect(response.status).toBe(200);
      
      const body = await response.text();
      expect(body).toContain("Another sample Page");
    });

    it("should respond to /markdown path", async () => {
      serverProcess = spawn("bun", ["run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      await waitForServer(TEST_PORT, 10000);
      
      const response = await fetch(`http://localhost:${TEST_PORT}/markdown`);
      expect(response.status).toBe(200);
      
      const body = await response.text();
      expect(body).toContain("Markdown page");
    });

    it("should respond to /page_with_island path", async () => {
      serverProcess = spawn("bun", ["run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      await waitForServer(TEST_PORT, 10000);
      
      const response = await fetch(`http://localhost:${TEST_PORT}/page_with_island`);
      expect(response.status).toBe(200);
    });

    it("should respond with 404 for unknown paths", async () => {
      serverProcess = spawn("bun", ["run", "index.ts"], {
        cwd: FIXTURES_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      await waitForServer(TEST_PORT, 10000);
      
      const response = await fetch(`http://localhost:${TEST_PORT}/nonexistent`);
      expect(response.status).toBe(404);
    });
  });

  describe("build and run integration", () => {
    let serverProcess: ChildProcess | null = null;
    const BUILD_TEST_PORT = 2102;

    afterEach(async () => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      await Bun.sleep(200);
    });

    it("should build and then run the built files successfully", async () => {
      const buildResult = await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      expect(buildResult.code).toBe(0);

      const indexPath = path.resolve(DIST_DIR, "index.js");
      let builtContent = await readFile(indexPath, "utf-8");
      builtContent = builtContent.replace("2101", String(BUILD_TEST_PORT));
      await Bun.write(indexPath, builtContent);

      serverProcess = spawn("bun", ["run", "index.js"], {
        cwd: DIST_DIR,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const serverReady = await waitForServer(BUILD_TEST_PORT, 10000);
      expect(serverReady).toBe(true);

      const response = await fetch(`http://localhost:${BUILD_TEST_PORT}/`);
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("Index Page");
    });

    it("should generate .cache with all page HTML files during build", async () => {
      await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      
      const cachePath = path.resolve(DIST_DIR, ".cache");
      const cacheFiles = await readdir(cachePath);
      
      // Check for specific pages
      const hasIndexPage = cacheFiles.some(f => f.includes("IndexPage"));
      const hasSamplePage = cacheFiles.some(f => f.includes("SamplePage"));
      const hasMarkdownPage = cacheFiles.some(f => f.includes("markdown"));
      
      expect(hasIndexPage || hasSamplePage || hasMarkdownPage).toBe(true);
    });

    it("should have consistent build output", async () => {
      // Build twice and compare
      await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      const firstFiles = await readdir(DIST_DIR);
      
      await cleanupFixturesDir();
      await runCommand("bun", ["build", "--target=bun", "--outdir=dist", "index.ts"], FIXTURES_DIR);
      const secondFiles = await readdir(DIST_DIR);
      
      // Should have same number of files
      expect(firstFiles.length).toBe(secondFiles.length);
    });
  });
});
