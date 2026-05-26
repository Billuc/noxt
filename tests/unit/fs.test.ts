/**
 * Unit tests for src/shell/fs.ts
 */
import {
  writeFile,
  readFile,
  removeFolder,
  getFilesMatchingGlob,
  type RelativePath,
} from "../../src/shell/fs";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { existsSync, lstatSync } from "node:fs";
import { rm, mkdir } from "node:fs/promises";

const TEST_DIR = path.join(import.meta.dir, "..", "..", "test-fs-temp");

async function setupTestDir() {
  await mkdir(TEST_DIR, { recursive: true });
}

async function cleanupTestDir() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

describe("fs module", () => {
  beforeEach(async () => {
    await cleanupTestDir();
    await setupTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir();
  });

  describe("writeFile", () => {
    it("should write content to a file", async () => {
      const filePath = path.join(TEST_DIR, "test.txt");
      const content = "Hello World";

      await writeFile(filePath, content);

      const result = await Bun.file(filePath).text();
      expect(result).toBe(content);
    });

    it("should create parent directories if they don't exist", async () => {
      const filePath = path.join(TEST_DIR, "nested", "dir", "test.txt");
      const content = "Nested content";

      await writeFile(filePath, content);

      const result = await Bun.file(filePath).text();
      expect(result).toBe(content);
    });

    it("should overwrite existing file", async () => {
      const filePath = path.join(TEST_DIR, "test.txt");
      const content1 = "First content";
      const content2 = "Second content";

      await writeFile(filePath, content1);
      await writeFile(filePath, content2);

      const result = await Bun.file(filePath).text();
      expect(result).toBe(content2);
    });
  });

  describe("readFile", () => {
    it("should read content from a file", async () => {
      const filePath = path.join(TEST_DIR, "test.txt");
      const content = "Hello Read";
      await Bun.write(filePath, content);

      const result = await readFile(filePath);
      expect(result).toBe(content);
    });

    it("should return empty string for empty file", async () => {
      const filePath = path.join(TEST_DIR, "empty.txt");
      await Bun.write(filePath, "");

      const result = await readFile(filePath);
      expect(result).toBe("");
    });

    it("should throw if the file doesn't exist", async () => {
      const filePath = path.join(TEST_DIR, "does-not-exist.txt");

      try {
        await readFile(filePath);
        throw new Error("should fail");
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toContain("no such file or directory");
      }
    });
  });

  describe("removeFolder", () => {
    it("should remove an empty directory", async () => {
      const dirPath = path.join(TEST_DIR, "empty-dir");
      await mkdir(dirPath);

      await removeFolder(dirPath);

      expect(existsSync(dirPath)).toBe(false);
    });

    it("should remove a directory with files recursively", async () => {
      const dirPath = path.join(TEST_DIR, "dir-with-files");
      await mkdir(dirPath);
      await Bun.write(path.join(dirPath, "file1.txt"), "content1");
      await Bun.write(path.join(dirPath, "file2.txt"), "content2");

      await removeFolder(dirPath);

      expect(existsSync(dirPath)).toBe(false);
    });

    it("should remove nested directories", async () => {
      const dirPath = path.join(TEST_DIR, "nested");
      await mkdir(path.join(dirPath, "level1", "level2"), { recursive: true });
      await Bun.write(
        path.join(dirPath, "level1", "level2", "file.txt"),
        "nested",
      );

      await removeFolder(dirPath);

      expect(existsSync(dirPath)).toBe(false);
    });

    it("should not throw if directory does not exist", async () => {
      const nonExistentPath = path.join(TEST_DIR, "does-not-exist");

      expect(removeFolder(nonExistentPath)).resolves.toBe(undefined);
    });
  });


  describe("getFilesMatchingGlob", () => {
    it("should return files matching a glob pattern", async () => {
      await mkdir(path.join(TEST_DIR, "subdir"), { recursive: true });
      await Bun.write(path.join(TEST_DIR, "file1.txt"), "");
      await Bun.write(path.join(TEST_DIR, "file2.txt"), "");
      await Bun.write(path.join(TEST_DIR, "file.log"), "");
      await Bun.write(path.join(TEST_DIR, "subdir", "file3.txt"), "");

      const results = await getFilesMatchingGlob("**/*.txt", TEST_DIR);

      expect(results.length).toBe(3);
      const fileNames = results.map((r) => r.fromRoot);
      expect(fileNames).toContain("file1.txt");
      expect(fileNames).toContain("file2.txt");
      expect(fileNames).toContain(path.join("subdir", "file3.txt"));
    });

    it("should return absolute paths", async () => {
      await Bun.write(path.join(TEST_DIR, "test.txt"), "");

      const results = await getFilesMatchingGlob("*.txt", TEST_DIR);

      expect(results.length).toBe(1);
      expect(results[0]!.absolute).toBe(path.resolve(TEST_DIR, "test.txt"));
    });

    it("should return RelativePath objects with fromRoot and absolute", async () => {
      await Bun.write(path.join(TEST_DIR, "test.txt"), "");

      const results = await getFilesMatchingGlob("*.txt", TEST_DIR);

      expect(results.length).toBe(1);
      expect(results[0]!.fromRoot).toBe("test.txt");
      expect(results[0]!.absolute).toBe(path.join(TEST_DIR, "test.txt"));
    });

    it("should return empty array when no files match", async () => {
      const results = await getFilesMatchingGlob("*.xyz", TEST_DIR);

      expect(results).toEqual([]);
    });

    it("should handle nested glob patterns", async () => {
      await mkdir(path.join(TEST_DIR, "a", "b", "c"), { recursive: true });
      await Bun.write(path.join(TEST_DIR, "a", "b", "c", "deep.txt"), "");

      const results = await getFilesMatchingGlob("a/**/*.txt", TEST_DIR);

      expect(results.length).toBe(1);
      expect(results[0]!.fromRoot).toBe(path.join("a", "b", "c", "deep.txt"));
    });
  });
});
