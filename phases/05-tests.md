# Phase 5: Update Tests

## Goal

Update the test suite to reflect the new two-step workflow and changed APIs.

## Files

| File | Action |
|------|--------|
| `tests/e2e/fixtures.test.ts` | **MODIFY** |
| `tests/integration/island.test.ts` | **MODIFY** |

## What to change

### `tests/e2e/fixtures.test.ts`

Restructure into four test groups:

```typescript
describe("generate command (bun run build.ts)", () => {
  beforeEach(async () => {
    // Clean .cache/, routes.js, dist/
  });

  it("should exit successfully", async () => {
    const cmd = Bun.spawn(["bun", "run", "build.ts"], { cwd: FIXTURES_DIR });
    await cmd.exited;
    expect(cmd.exitCode).toBe(0);
  });

  it("should generate .cache directory with HTML files", async () => { ... });
  it("should generate routes.js at project root", async () => { ... });
  it("should generate routes.js with island script routes", async () => { ... });
  it("should generate manifest.json", async () => { ... });
  it("should generate unique hashes", async () => { ... });
});

describe("bundle command (bun build --target=bun --outdir=dist index.ts)", () => {
  beforeEach(async () => {
    // Run build.ts first
    await Bun.spawn(["bun", "run", "build.ts"], { cwd: FIXTURES_DIR }).exited;
  });

  it("should bundle successfully", async () => { ... });
  it("should generate index.js in dist directory", async () => { ... });
  it("should include .cache and routes.js in dist output", async () => {
    // Read dist/index.js and check it contains the cache references
  });
  it("should contain Bun.serve in output", async () => { ... });
});

describe("server (bun run index.ts)", () => {
  let serverProcess: Bun.Subprocess | null = null;

  beforeEach(async () => {
    await Bun.spawn(["bun", "run", "build.ts"], { cwd: FIXTURES_DIR }).exited;
  });

  afterEach(async () => {
    serverProcess?.kill();
    await Bun.sleep(200);
  });

  it("should respond to / with index page", async () => {
    serverProcess = Bun.spawn(["bun", "run", "index.ts"], { cwd: FIXTURES_DIR });
    await Bun.sleep(300);
    const response = await fetch(`http://localhost:2101/`);
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Index Page");
  });

  it("should respond to /sample", async () => { ... });
  it("should respond to /sample2", async () => { ... });
  it("should respond to /markdown", async () => { ... });
  it("should respond to /page_with_island", async () => { ... });
  it("should return 404 for unknown paths", async () => { ... });
});

describe("build and run integration", () => {
  // build.ts → bun build → bun run: full production workflow
  it("should build then bundle then serve successfully", async () => { ... });
  it("should generate consistent output across rebuilds", async () => { ... });
});
```

### `tests/integration/island.test.ts`

Replace `prepareIsland` tests with `prerenderIslands` + `useIsland` tests:

```typescript
import { prereenderIslands, useIsland } from "../../src/shell/build";
// ... remove import { prepareIsland } from "../../src/shell/island";

describe("prerenderIslands", () => {
  it("should scan islands directory and write scripts", async () => {
    const entries = await prereenderIslands();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(await Bun.file(entry.scriptPath).exists()).toBe(true);
    }
  });

  it("should return entries with valid hashes", async () => { ... });
  it("should return entries with component references", async () => { ... });
});

describe("useIsland", () => {
  it("should return a wrapper component", () => {
    // Import an island, call useIsland, check it returns a function
  });

  it("should throw for unprerendered islands", () => {
    const fakeComponent = () => null;
    expect(() => useIsland(fakeComponent)).toThrow("not been prerendered");
  });
});
```

Note: function name in the tests should match the actual export name `prerenderIslands` (not `prereenderIslands`). Use `prerenderIslands` throughout.

## How to verify

- `bun test` passes all tests
- `bun test tests/e2e/fixtures.test.ts` passes e2e tests
- `bun test tests/integration/island.test.ts` passes island tests
- Clean up generated files: `del .cache routes.js`
