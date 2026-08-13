/**
 * Integration tests for src/islands/build.ts
 */
import { discoverIslands, prerenderIslands } from "../../../src/islands/build";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { mkdir, rm, writeFile, exists, readdir } from "node:fs/promises";
import { Path } from "../../../src/core/fs";

const TEST_DIR = path.join(import.meta.dir, "test-islands-project");
const ISLANDS_DIR = path.join(TEST_DIR, "src", "islands");
const originalCwd = process.cwd();

async function setupTestProject() {
  await mkdir(ISLANDS_DIR, { recursive: true });

  await writeFile(
    path.join(ISLANDS_DIR, "Counter.tsx"),
    `import { h } from "preact";

export default function Counter({ count }: { count: number }) {
  return <div>Count: {count}</div>;
}
`,
  );

  await writeFile(
    path.join(ISLANDS_DIR, "Greeting.ts"),
    `import { h } from "preact";

export default function Greeting({ name }: { name: string }) {
  return h("div", null, ["Hello, ", name, "!"]);
}
`,
  );

  await writeFile(
    path.join(ISLANDS_DIR, "NoDefault.tsx"),
    `import { h } from "preact";

export function NotDefault() {
  return h("div", null, "No default export");
}
`,
  );
}

async function setupTestProjectWithExtensions() {
  await mkdir(ISLANDS_DIR, { recursive: true });

  await writeFile(
    path.join(ISLANDS_DIR, "ComponentA.tsx"),
    `import { h } from "preact";
export default function ComponentA() { return <div>TSX</div>; }`,
  );
  await writeFile(
    path.join(ISLANDS_DIR, "ComponentB.ts"),
    `import { h } from "preact";
export default function ComponentB() { return h("div", null, "TS"); }`,
  );
  await writeFile(
    path.join(ISLANDS_DIR, "ComponentC.jsx"),
    `import { h } from "preact";
export default function ComponentC() { return <div>JSX</div>; }`,
  );
  await writeFile(
    path.join(ISLANDS_DIR, "ComponentD.js"),
    `import { h } from "preact";
export default function ComponentD() { return h("div", null, "JS"); }`,
  );
  await writeFile(
    path.join(ISLANDS_DIR, "ComponentE.foo"),
    `import { h } from "preact";
export default function ComponentD() { return h("div", null, "JS"); }`,
  );
}

async function setupTestProjectWithNestedDirs() {
  await mkdir(ISLANDS_DIR, { recursive: true });
  await mkdir(path.join(ISLANDS_DIR, "subdir"), { recursive: true });

  await writeFile(
    path.join(ISLANDS_DIR, "RootIsland.tsx"),
    `import { h } from "preact";
export default function RootIsland() { return h("div", null, "Root"); }`,
  );
  await writeFile(
    path.join(ISLANDS_DIR, "subdir", "NestedIsland.tsx"),
    `import { h } from "preact";
export default function NestedIsland() { return h("div", null, "Nested"); }`,
  );
}

async function setupTestProjectWithSpecialChars() {
  await mkdir(ISLANDS_DIR, { recursive: true });

  await writeFile(
    path.join(ISLANDS_DIR, "Special-Name.tsx"),
    `import { h } from "preact";
export default function SpecialName() { return h("div", null, "Special"); }`,
  );
  await writeFile(
    path.join(ISLANDS_DIR, "Component_123.tsx"),
    `import { h } from "preact";
export default function Component123() { return h("div", null, "123"); }`,
  );
}

async function cleanupTestProject() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

/** Safely resets the dummy project: the directory must NOT be the process
 *  cwd when deleted, or Windows returns EBUSY. */
async function resetTestProject(setup: () => Promise<void> = setupTestProject) {
  process.chdir(originalCwd);
  await cleanupTestProject();
  await setup();
  process.chdir(TEST_DIR);
}

describe("islands/build", () => {
  beforeEach(async () => {
    await resetTestProject();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTestProject();
  });

  describe("discoverIslands", () => {
    it("should discover island components from islands directory", async () => {
      const islands = await discoverIslands();
      expect(islands.length).toBe(2);
      expect(
        islands.some((i) => i.sourceFile.absolute.includes("Counter")),
      ).toBe(true);
      expect(
        islands.some((i) => i.sourceFile.absolute.includes("Greeting")),
      ).toBe(true);
    });

    it("should skip files without default export", async () => {
      const islands = await discoverIslands();
      expect(
        islands.some((i) => i.sourceFile.absolute.includes("NoDefault")),
      ).toBe(false);
      expect(islands.length).toBe(2);
    });

    it("should return IslandSourceEntry objects with component and sourceFile", async () => {
      const islands = await discoverIslands();
      for (const entry of islands) {
        expect(entry).toHaveProperty("component");
        expect(entry).toHaveProperty("sourceFile");
        expect(entry.sourceFile).toBeInstanceOf(Path);
        expect(entry.component).toBeDefined();
        expect(typeof entry.component).toBe("function");
      }
    });

    it("should return empty array when no islands directory exists", async () => {
      await rm(ISLANDS_DIR, { recursive: true, force: true });
      const islands = await discoverIslands();
      expect(islands).toEqual([]);
    });

    it("should discover islands with .tsx extension", async () => {
      const islands = await discoverIslands();
      expect(islands.some((i) => i.sourceFile.absolute.endsWith(".tsx"))).toBe(
        true,
      );
    });

    it("should discover islands with .ts extension", async () => {
      const islands = await discoverIslands();
      expect(islands.some((i) => i.sourceFile.absolute.endsWith(".ts"))).toBe(
        true,
      );
    });

    it("should discover islands with various JS-related extension", async () => {
      await resetTestProject(setupTestProjectWithExtensions);

      const islands = await discoverIslands();

      expect(islands.some((i) => i.sourceFile.absolute.endsWith(".ts"))).toBe(
        true,
      );
      expect(islands.some((i) => i.sourceFile.absolute.endsWith(".tsx"))).toBe(
        true,
      );
      expect(islands.some((i) => i.sourceFile.absolute.endsWith(".js"))).toBe(
        true,
      );
      expect(islands.some((i) => i.sourceFile.absolute.endsWith(".jsx"))).toBe(
        true,
      );
      expect(islands.some((i) => i.sourceFile.absolute.endsWith(".foo"))).toBe(
        false,
      );
    });

    it("should handle nested directories within islands folder", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const islands = await discoverIslands();
      expect(islands.length).toBeGreaterThanOrEqual(1);
      expect(
        islands.some((i) => i.sourceFile.absolute.includes("RootIsland")),
      ).toBe(true);
    });

    it("should return Path objects with correct absolute paths", async () => {
      const islands = await discoverIslands();
      for (const entry of islands) {
        expect(entry.sourceFile.absolute).toBeTruthy();
        expect(entry.sourceFile.absolute).toContain(ISLANDS_DIR);
      }
      expect(
        islands.some(
          (entry) =>
            entry.sourceFile.absolute === path.join(ISLANDS_DIR, "Counter.tsx"),
        ),
      ).toBe(true);
      expect(
        islands.some(
          (entry) =>
            entry.sourceFile.absolute === path.join(ISLANDS_DIR, "Greeting.ts"),
        ),
      ).toBe(true);
    });

    it("should handle islands with special characters in their names", async () => {
      await resetTestProject(setupTestProjectWithSpecialChars);
      const islands = await discoverIslands();
      expect(islands.length).toBe(2);
      expect(
        islands.some((i) => i.sourceFile.absolute.includes("Special-Name")),
      ).toBe(true);
      expect(
        islands.some((i) => i.sourceFile.absolute.includes("Component_123")),
      ).toBe(true);
    });
  });

  describe("prerenderIslands", () => {
    it("should handle empty island list", async () => {
      const rendered = await prerenderIslands([]);
      expect(rendered).toEqual([]);
    });

    it("should prerender islands and return IslandEntry objects", async () => {
      const discovered = await discoverIslands();
      const rendered = await prerenderIslands(discovered);
      expect(rendered.length).toBe(2);
      for (const entry of rendered) {
        expect(entry).toHaveProperty("component");
        expect(entry).toHaveProperty("hash");
        expect(entry).toHaveProperty("files");
        expect(entry.component).toBeFunction();
        expect(entry.hash).toBeString();
        expect(entry.files).toBeArray();
      }
    });

    it("should generate script files in cache directory", async () => {
      const discovered = await discoverIslands();

      await prerenderIslands(discovered);

      const cacheIslandsDir = path.join(TEST_DIR, ".cache", "_islands");
      expect(exists(cacheIslandsDir)).resolves.toBeTrue();

      const generatedFiles = await readdir(cacheIslandsDir);
      expect(generatedFiles.some((f) => f.includes("Greeting"))).toBeTrue();
      expect(generatedFiles.some((f) => f.includes("Counter"))).toBeTrue();
    });

    it("should generate unique hashes for different components", async () => {
      const discovered = await discoverIslands();

      const rendered = await prerenderIslands(discovered);

      const hashes = rendered.map((e) => e.hash);
      const uniqueHashes = new Set(hashes);
      expect(hashes.length).toBe(uniqueHashes.size);
    });

    it("should generate consistent hashes for the same component", async () => {
      const discovered = await discoverIslands();
      const rendered1 = await prerenderIslands(discovered);
      await resetTestProject();
      const discovered2 = await discoverIslands();
      const rendered2 = await prerenderIslands(discovered2);

      expect(rendered1.length).toBe(rendered2.length);
      for (let i = 0; i < rendered1.length; i++) {
        expect(rendered1[i]!.hash).toBe(rendered2[i]!.hash);
      }
    });

    it("should verify generated files exist", async () => {
      const discovered = await discoverIslands();
      const rendered = await prerenderIslands(discovered);
      for (const entry of rendered) {
        for (const file of entry.files) {
          expect(exists(file.absolute)).resolves.toBeTrue();
        }
      }
    });

    it("should prerender a single island correctly", async () => {
      const discovered = await discoverIslands();
      const singleIsland = discovered.slice(0, 1);
      const rendered = await prerenderIslands(singleIsland);
      expect(rendered.length).toBe(1);
      expect(rendered[0]!.hash).toBeTruthy();
      expect(rendered[0]!.files.length).toBeGreaterThan(0);
    });
  });
});
