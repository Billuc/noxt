/**
 * Integration tests for src/ssr/build.ts
 */
import { discoverSSRRoutes, generateSSRFile } from "../../../src/ssr/build";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { mkdir, rm, writeFile, exists } from "node:fs/promises";
import { Path } from "../../../src/core/fs";
import type { SSRRouteEntry } from "../../../src/ssr/types";

const TEST_DIR = path.join(import.meta.dir, "test-ssr-project");
const SSR_DIR = path.join(TEST_DIR, "src", "ssr");
const originalCwd = process.cwd();
// Fixtures import the builders via the "noxt/ssr" package export,
// mirroring how the API suite uses "noxt/api".
const SSR_IMPORT = `import { query, mutation } from "noxt/ssr";`;
const QUERY_IMPORT = `import { query } from "noxt/ssr";`;

/** Escapes a string so it can be embedded literally in a RegExp source. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds a minimal controlled SSR route entry for generateSSRFile. */
function createEntry(
  method: string,
  route: string,
  filePath: string,
): SSRRouteEntry<any> {
  return {
    method: method as any,
    route,
    input: null as any,
    file: Path.fromRelative(filePath),
  };
}

async function setupTestProject() {
  await mkdir(SSR_DIR, { recursive: true });

  // A file with both a query (GET) and a mutation (POST) route.
  // Handlers return plain strings (valid ComponentChildren), so no
  // JSX transform is needed in fixtures.
  await writeFile(
    path.join(SSR_DIR, "greeting.ts"),
    `${SSR_IMPORT}
import * as s from "superstruct";

export const GET = query()
  .input(s.object({ name: s.string() }))
  .route(({ input }) => \`Hello \${input.name}!\`);

export const POST = mutation()
  .input(s.object({ name: s.string() }))
  .route(({ input }) => \`Created \${input.name}!\`);
`,
  );

  // A simple route without explicit input (defaults to {}).
  await writeFile(
    path.join(SSR_DIR, "card.ts"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "static card");
`,
  );

  // A file with multiple HTTP methods.
  await writeFile(
    path.join(SSR_DIR, "feed.ts"),
    `${SSR_IMPORT}
import * as s from "superstruct";

export const GET = query()
  .input(s.object({ tag: s.string() }))
  .route(({ input }) => \`feed:\${input.tag}\`);

export const POST = mutation()
  .input(s.object({ title: s.string() }))
  .route(({ input }) => \`posted:\${input.title}\`);

export const DELETE = mutation()
  .input(s.object({ id: s.string() }))
  .route(({ input }) => \`deleted:\${input.id}\`);
`,
  );
}

async function setupTestProjectWithNestedDirs() {
  await mkdir(SSR_DIR, { recursive: true });
  await mkdir(path.join(SSR_DIR, "v1"), { recursive: true });
  await mkdir(path.join(SSR_DIR, "v1", "users"), { recursive: true });

  await writeFile(
    path.join(SSR_DIR, "root.ts"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "root fragment");
`,
  );

  await writeFile(
    path.join(SSR_DIR, "v1", "api.ts"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "v1 fragment");
`,
  );

  await writeFile(
    path.join(SSR_DIR, "v1", "users", "list.ts"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "user list");
`,
  );
}

async function setupTestProjectWithExtensions() {
  await mkdir(SSR_DIR, { recursive: true });

  await writeFile(
    path.join(SSR_DIR, "endpoint.ts"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "ts fragment");
`,
  );

  await writeFile(
    path.join(SSR_DIR, "endpoint.js"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "js fragment");
`,
  );
}

async function setupTestProjectWithSpecialChars() {
  await mkdir(SSR_DIR, { recursive: true });

  await writeFile(
    path.join(SSR_DIR, "user-card.ts"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "user card");
`,
  );

  await writeFile(
    path.join(SSR_DIR, "frag_v2.ts"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "frag v2");
`,
  );
}

async function setupTestProjectWithNonRouteExports() {
  await mkdir(SSR_DIR, { recursive: true });

  await writeFile(
    path.join(SSR_DIR, "mixed.ts"),
    `${QUERY_IMPORT}

 // This is a valid route
export const GET = query().route(() => "valid");

// This is not an SSRRoute instance
export const helperFunction = () => "helper";

// This is a plain object, not an SSRRoute
export const config = { name: "test" };

// This is an SSRRoute but for a different method
export const POST = query().route(() => "created");

// This is a plain object under a method name, not an SSRRoute
export const PUT = { not: "a route" };
`,
  );
}

async function setupTestProjectWithIndexRoute() {
  await mkdir(SSR_DIR, { recursive: true });
  await mkdir(path.join(SSR_DIR, "panel"), { recursive: true });

  await writeFile(
    path.join(SSR_DIR, "panel", "index.ts"),
    `${QUERY_IMPORT}

export const GET = query().route(() => "panel");
`,
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

describe("ssr/build", () => {
  beforeEach(async () => {
    await resetTestProject();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTestProject();
  });

  describe("discoverSSRRoutes", () => {
    it("should discover SSR routes from ssr directory", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();
      expect(ssrRouteEntries.length).toBeGreaterThan(0);
      expect(ssrRouteEntries.some((e) => e.route === "/ssr/greeting")).toBe(
        true,
      );
      expect(ssrRouteEntries.some((e) => e.route === "/ssr/card")).toBe(true);
      expect(ssrRouteEntries.some((e) => e.route === "/ssr/feed")).toBe(true);
    });

    it("should discover all HTTP methods for a route", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();
      const feedRoutes = ssrRouteEntries.filter((e) => e.route === "/ssr/feed");

      expect(feedRoutes.length).toBeGreaterThanOrEqual(3);
      expect(feedRoutes.some((e) => e.method === "GET")).toBe(true);
      expect(feedRoutes.some((e) => e.method === "POST")).toBe(true);
      expect(feedRoutes.some((e) => e.method === "DELETE")).toBe(true);
    });

    it("should discover both query and mutation builders in one file", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();
      const greetingRoutes = ssrRouteEntries.filter(
        (e) => e.route === "/ssr/greeting",
      );

      expect(greetingRoutes.length).toBe(2);
      expect(greetingRoutes.some((e) => e.method === "GET")).toBe(true);
      expect(greetingRoutes.some((e) => e.method === "POST")).toBe(true);
    });

    it("should return SSRRouteEntry objects with correct structure", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();

      for (const entry of ssrRouteEntries) {
        expect(entry).toHaveProperty("method");
        expect(entry).toHaveProperty("route");
        expect(entry).toHaveProperty("input");
        expect(entry).toHaveProperty("file");
        expect(entry).not.toHaveProperty("output");
        expect(entry.file).toBeInstanceOf(Path);
        expect(entry.method).toBeOneOf([
          "GET",
          "POST",
          "PUT",
          "DELETE",
          "PATCH",
        ]);
        expect(typeof entry.route).toBe("string");
        expect(entry.route.startsWith("/ssr/")).toBe(true);
      }
    });

    it("should return empty array when no ssr directory exists", async () => {
      await rm(SSR_DIR, { recursive: true, force: true });
      const { ssrRouteEntries } = await discoverSSRRoutes();
      expect(ssrRouteEntries).toEqual([]);
    });

    it("should discover routes with .ts extension", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();
      expect(ssrRouteEntries.some((e) => e.file.absolute.endsWith(".ts"))).toBe(
        true,
      );
    });

    it("should discover routes with .js extension", async () => {
      await resetTestProject(setupTestProjectWithExtensions);
      const { ssrRouteEntries } = await discoverSSRRoutes();

      expect(ssrRouteEntries.some((e) => e.file.absolute.endsWith(".ts"))).toBe(
        true,
      );
      expect(ssrRouteEntries.some((e) => e.file.absolute.endsWith(".js"))).toBe(
        true,
      );
    });

    it("should handle nested directories within ssr folder", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const { ssrRouteEntries } = await discoverSSRRoutes();

      expect(ssrRouteEntries.length).toBeGreaterThanOrEqual(3);
      expect(ssrRouteEntries.some((e) => e.route === "/ssr/root")).toBe(true);
      expect(ssrRouteEntries.some((e) => e.route === "/ssr/v1/api")).toBe(true);
      expect(
        ssrRouteEntries.some((e) => e.route === "/ssr/v1/users/list"),
      ).toBe(true);
    });

    it("should return Path objects with correct absolute paths", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();

      for (const entry of ssrRouteEntries) {
        expect(entry.file.absolute).toBeTruthy();
        expect(entry.file.absolute).toStartWith(SSR_DIR);
      }
    });

    it("should handle routes with special characters in their names", async () => {
      await resetTestProject(setupTestProjectWithSpecialChars);
      const { ssrRouteEntries } = await discoverSSRRoutes();

      expect(ssrRouteEntries.length).toBe(2);
      expect(ssrRouteEntries.some((e) => e.route === "/ssr/user-card")).toBe(
        true,
      );
      expect(ssrRouteEntries.some((e) => e.route === "/ssr/frag_v2")).toBe(
        true,
      );
    });

    it("should only discover exports that are SSRRoute instances", async () => {
      await resetTestProject(setupTestProjectWithNonRouteExports);
      const { ssrRouteEntries } = await discoverSSRRoutes();

      // Should find GET and POST from mixed.ts, but not helperFunction,
      // config, or the plain-object PUT.
      expect(ssrRouteEntries.length).toBe(2);
      expect(ssrRouteEntries.some((e) => e.method === "GET")).toBe(true);
      expect(ssrRouteEntries.some((e) => e.method === "POST")).toBe(true);
    });

    it("should correctly parse route names from file paths", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();

      const greetingRoutes = ssrRouteEntries.filter((e) =>
        e.route.includes("greeting"),
      );
      expect(greetingRoutes.length).toBeGreaterThan(0);

      for (const greetingRoute of greetingRoutes) {
        expect(greetingRoute.route).toMatch(/^\/ssr\/greeting$/);
      }
    });

    it("should preserve input schemas", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();

      const greetingGet = ssrRouteEntries.find(
        (e) => e.route.includes("greeting") && e.method === "GET",
      );

      expect(greetingGet).toBeDefined();
      expect(greetingGet?.input).toBeDefined();
    });

    it("should have the route shortened if filename is index", async () => {
      await resetTestProject(setupTestProjectWithIndexRoute);

      const { ssrRouteEntries } = await discoverSSRRoutes();

      expect(ssrRouteEntries.some((e) => e.route === "/ssr/panel")).toBeTrue();
    });

    it("should serve rendered HTML for a discovered query route", async () => {
      const mod = await import(path.join(SSR_DIR, "greeting.ts"));
      const res: Response = await mod.GET.handler(
        new Request("http://localhost/ssr/greeting?name=Ann"),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/html");
      expect(await res.text()).toContain("Hello Ann!");
    });

    it("should return 400 for a query route with invalid input", async () => {
      const mod = await import(path.join(SSR_DIR, "greeting.ts"));
      const res: Response = await mod.GET.handler(
        new Request("http://localhost/ssr/greeting"),
      );

      expect(res.status).toBe(400);
    });

    it("should serve rendered HTML for a discovered mutation route", async () => {
      const { toBody } = await import("../../../src/core/url");
      const mod = await import(path.join(SSR_DIR, "greeting.ts"));
      const res: Response = await mod.POST.handler(
        new Request("http://localhost/ssr/greeting", {
          method: "POST",
          body: toBody({ name: "Bob" }),
        }),
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/html");
      expect(await res.text()).toContain("Created Bob!");
    });
  });

  describe("generateSSRFile", () => {
    const utilsFile = () => path.resolve(TEST_DIR, ".cache", "ssr.ts");

    it("should generate the exact expected file for an empty routes list", async () => {
      await generateSSRFile({ ssrRouteEntries: [] });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toBe(`// Auto-generated by noxt
import { getSSRHandlers } from "noxt/runtime";
import type { InferDefinitions } from "noxt";


const ssrRoutesData = {
  
} as const;
const handlers = getSSRHandlers(ssrRoutesData, "");

type SSRRoutes = InferDefinitions<typeof ssrRoutesData>;

export { type SSRRoutes, handlers };
`);
    });

    it("should forward the base to getSSRHandlers", async () => {
      await generateSSRFile({ ssrRouteEntries: [], base: "/docs" });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toContain(
        `const handlers = getSSRHandlers(ssrRoutesData, "/docs");`,
      );
    });

    it("should generate import and ssrRoutesData for a single controlled route", async () => {
      const greetingFile = path.join(TEST_DIR, "src", "ssr", "greeting.ts");
      await generateSSRFile({
        ssrRouteEntries: [createEntry("GET", "/ssr/greeting", greetingFile)],
      });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toMatch(
        new RegExp(
          `import \\{ GET as _ssr_greeting_GET \\} from ${escapeRegExp(JSON.stringify(path.resolve(greetingFile)))};`,
        ),
      );
      expect(content).toMatch(
        /const ssrRoutesData = \{\n  "\/ssr\/greeting": \{\n    "GET": _ssr_greeting_GET\n  \}\n\} as const;/,
      );
    });

    it("should generate one import per file and merge methods in ssrRoutesData", async () => {
      const greetingFile = path.join(TEST_DIR, "src", "ssr", "greeting.ts");
      const feedFile = path.join(TEST_DIR, "src", "ssr", "feed.ts");
      await generateSSRFile({
        ssrRouteEntries: [
          createEntry("GET", "/ssr/greeting", greetingFile),
          createEntry("POST", "/ssr/greeting", greetingFile),
          createEntry("GET", "/ssr/feed", feedFile),
          createEntry("DELETE", "/ssr/feed", feedFile),
        ],
      });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toMatch(
        new RegExp(
          `import \\{ GET as _ssr_greeting_GET, POST as _ssr_greeting_POST \\} from ${escapeRegExp(JSON.stringify(path.resolve(greetingFile)))};`,
        ),
      );
      expect(content).toMatch(
        new RegExp(
          `import \\{ GET as _ssr_feed_GET, DELETE as _ssr_feed_DELETE \\} from ${escapeRegExp(JSON.stringify(path.resolve(feedFile)))};`,
        ),
      );
      expect(content).toMatch(
        /const ssrRoutesData = \{\n  "\/ssr\/greeting": \{\n    "GET": _ssr_greeting_GET,\n    "POST": _ssr_greeting_POST\n  \},\n  "\/ssr\/feed": \{\n    "GET": _ssr_feed_GET,\n    "DELETE": _ssr_feed_DELETE\n  \}\n\} as const;/,
      );
    });

    it("should generate imports matching discovered routes", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();
      await generateSSRFile({ ssrRouteEntries });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toMatch(
        /import \{ GET as _ssr_card_GET \} from "[^"]+card\.ts";/,
      );
      expect(content).toMatch(
        /import \{ GET as _ssr_feed_GET, POST as _ssr_feed_POST, DELETE as _ssr_feed_DELETE \} from "[^"]+feed\.ts";/,
      );
      expect(content).toMatch(
        /import \{ GET as _ssr_greeting_GET, POST as _ssr_greeting_POST \} from "[^"]+greeting\.ts";/,
      );
    });

    it("should generate the ssrRoutesData for discovered routes", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();
      await generateSSRFile({ ssrRouteEntries });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toContain(`"/ssr/card": {
    "GET": _ssr_card_GET
  }`);
      expect(content).toContain(`"/ssr/feed": {
    "GET": _ssr_feed_GET,
    "POST": _ssr_feed_POST,
    "DELETE": _ssr_feed_DELETE
  }`);
      expect(content).toContain(`"/ssr/greeting": {
    "GET": _ssr_greeting_GET,
    "POST": _ssr_greeting_POST
  }`);
    });

    it("should create cache directory if it doesn't exist", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();
      await generateSSRFile({ ssrRouteEntries });

      const cacheDir = path.resolve(TEST_DIR, ".cache");
      expect(await exists(cacheDir)).toBe(true);
    });

    it("should overwrite existing SSR file", async () => {
      const { ssrRouteEntries } = await discoverSSRRoutes();

      await mkdir(path.dirname(utilsFile()), { recursive: true });
      await writeFile(utilsFile(), "to overwrite");
      await generateSSRFile({ ssrRouteEntries });
      const content = await Bun.file(utilsFile()).text();

      expect(content).not.toBe("to overwrite");
    });
  });
});
