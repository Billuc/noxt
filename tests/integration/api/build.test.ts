/**
 * Integration tests for src/api/build.ts
 */
import { discoverAPIs, generateAPIFile } from "../../../src/api/build";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import path from "node:path";
import { mkdir, rm, writeFile, exists } from "node:fs/promises";
import { Path } from "../../../src/core/fs";
import type { APIEndpointEntry } from "../../../src/api/types";

const TEST_DIR = path.join(import.meta.dir, "test-api-project");
const API_DIR = path.join(TEST_DIR, "src", "api");
const originalCwd = process.cwd();

/** Escapes a string so it can be embedded literally in a RegExp source. */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds a minimal controlled API endpoint entry for generateAPIFile. */
function createEntry(
  method: string,
  route: string,
  filePath: string,
): APIEndpointEntry<any, any> {
  return {
    method: method as any,
    route,
    input: null as any,
    output: null as any,
    file: Path.resolve(filePath),
  };
}

async function setupTestProject() {
  await mkdir(API_DIR, { recursive: true });

  // Create a file with both GET and POST endpoints
  await writeFile(
    path.join(API_DIR, "users.ts"),
    `import { query, mutation } from "noxt/api";
import * as s from "superstruct";

const QueryInput = s.object({ id: s.string() });
const QueryOutput = s.object({ name: s.string(), email: s.string() });

export const GET = query()
  .input(QueryInput)
  .output(QueryOutput)
  .endpoint(async ({ input }) => {
    return { name: "John Doe", email: "john@example.com" };
  });

const MutationInput = s.object({ name: s.string(), email: s.string() });
const MutationOutput = s.object({ id: s.string(), created: s.boolean() });

export const POST = mutation()
  .input(MutationInput)
  .output(MutationOutput)
  .endpoint(async ({ input }) => {
    return { id: "123", created: true };
  });
`,
  );

  // Create a simple endpoint without input/output
  await writeFile(
    path.join(API_DIR, "health.ts"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

export const GET = query()
  .endpoint(async () => {
    return { status: "ok" };
  });
`,
  );

  // Create a file with multiple HTTP methods
  await writeFile(
    path.join(API_DIR, "posts.ts"),
    `import { query, mutation } from "noxt/api";
import * as s from "superstruct";

const PostInput = s.object({ title: s.string(), content: s.string() });
const PostOutput = s.object({ id: s.string(), title: s.string() });

// GET all posts
export const GET = query()
  .output(s.array(PostOutput))
  .endpoint(async () => {
    return [{ id: "1", title: "First post" }];
  });

// POST a new post
export const POST = mutation()
  .input(PostInput)
  .output(PostOutput)
  .endpoint(async ({ input }) => {
    return { id: "new-id", title: input.title };
  });

// DELETE a post
export const DELETE = mutation()
  .input(s.object({ id: s.string() }))
  .output(s.object({ success: s.boolean() }))
  .endpoint(async ({ input }) => {
    return { success: true };
  });
`,
  );
}

async function setupTestProjectWithNestedDirs() {
  await mkdir(API_DIR, { recursive: true });
  await mkdir(path.join(API_DIR, "v1"), { recursive: true });
  await mkdir(path.join(API_DIR, "v1", "users"), { recursive: true });

  await writeFile(
    path.join(API_DIR, "root.ts"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

export const GET = query()
  .endpoint(async () => {
    return { message: "root endpoint" };
  });
`,
  );

  await writeFile(
    path.join(API_DIR, "v1", "api.ts"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

export const GET = query()
  .endpoint(async () => {
    return { version: "1.0" };
  });
`,
  );

  await writeFile(
    path.join(API_DIR, "v1", "users", "list.ts"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

export const GET = query()
  .endpoint(async () => {
    return { users: [] };
  });
`,
  );
}

async function setupTestProjectWithExtensions() {
  await mkdir(API_DIR, { recursive: true });

  await writeFile(
    path.join(API_DIR, "endpoint.ts"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

export const GET = query()
  .endpoint(async () => {
    return { type: "ts" };
  });
`,
  );

  await writeFile(
    path.join(API_DIR, "endpoint.js"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

export const GET = query()
  .endpoint(async () => {
    return { type: "js" };
  });
`,
  );
}

async function setupTestProjectWithSpecialChars() {
  await mkdir(API_DIR, { recursive: true });

  await writeFile(
    path.join(API_DIR, "user-profile.ts"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

export const GET = query()
  .endpoint(async () => {
    return { profile: "special" };
  });
`,
  );

  await writeFile(
    path.join(API_DIR, "api_v2.ts"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

export const GET = query()
  .endpoint(async () => {
    return { version: "2.0" };
  });
`,
  );
}

async function setupTestProjectWithNonEndpointExports() {
  await mkdir(API_DIR, { recursive: true });

  await writeFile(
    path.join(API_DIR, "mixed.ts"),
    `import { query } from "noxt/api";
import * as s from "superstruct";

 // This is a valid endpoint
export const GET = query()
  .endpoint(async () => {
    return { valid: true };
  });

// This is not an APIEndpoint instance
export const helperFunction = () => "helper";

// This is a plain object, not an APIEndpoint
export const config = { name: "test" };

// This is an APIEndpoint but for a different method
export const POST = query()
  .endpoint(async () => {
    return { created: true };
  });
`,
  );
}

async function setupTestProjectWithIndexEndpoint() {
  await mkdir(API_DIR, { recursive: true });
  await mkdir(path.join(API_DIR, "health"), { recursive: true });

  await writeFile(
    path.join(API_DIR, "health", "index.ts"),
    `import { query } from "noxt/api";

export const GET = query()
  .endpoint(async () => {
    return { status: "ok" };
  });
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

describe("api/build", () => {
  beforeEach(async () => {
    await resetTestProject();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupTestProject();
  });

  describe("discoverAPIs", () => {
    it("should discover API endpoints from api directory", async () => {
      const { endpointEntries } = await discoverAPIs();
      expect(endpointEntries.length).toBeGreaterThan(0);
      expect(endpointEntries.some((e) => e.route === "/api/users")).toBe(true);
      expect(endpointEntries.some((e) => e.route === "/api/health")).toBe(true);
      expect(endpointEntries.some((e) => e.route === "/api/posts")).toBe(true);
    });

    it("should discover all HTTP methods for a route", async () => {
      const { endpointEntries } = await discoverAPIs();
      const postsEndpoints = endpointEntries.filter(
        (e) => e.route === "/api/posts",
      );

      expect(postsEndpoints.length).toBeGreaterThanOrEqual(3);
      expect(postsEndpoints.some((e) => e.method === "GET")).toBe(true);
      expect(postsEndpoints.some((e) => e.method === "POST")).toBe(true);
      expect(postsEndpoints.some((e) => e.method === "DELETE")).toBe(true);
    });

    it("should return APIEndpointEntry objects with correct structure", async () => {
      const { endpointEntries } = await discoverAPIs();

      for (const entry of endpointEntries) {
        expect(entry).toHaveProperty("method");
        expect(entry).toHaveProperty("route");
        expect(entry).toHaveProperty("input");
        expect(entry).toHaveProperty("output");
        expect(entry).toHaveProperty("file");
        expect(entry.file).toBeInstanceOf(Path);
        expect(entry.method).toBeOneOf([
          "GET",
          "POST",
          "PUT",
          "DELETE",
          "PATCH",
        ]);
        expect(typeof entry.route).toBe("string");
        expect(entry.route.startsWith("/api/")).toBe(true);
      }
    });

    it("should return empty array when no api directory exists", async () => {
      await rm(API_DIR, { recursive: true, force: true });
      const { endpointEntries } = await discoverAPIs();
      expect(endpointEntries).toEqual([]);
    });

    it("should discover endpoints with .ts extension", async () => {
      const { endpointEntries } = await discoverAPIs();
      expect(endpointEntries.some((e) => e.file.absolute.endsWith(".ts"))).toBe(
        true,
      );
    });

    it("should discover endpoints with .js extension", async () => {
      await resetTestProject(setupTestProjectWithExtensions);
      const { endpointEntries } = await discoverAPIs();

      expect(endpointEntries.some((e) => e.file.absolute.endsWith(".ts"))).toBe(
        true,
      );
      expect(endpointEntries.some((e) => e.file.absolute.endsWith(".js"))).toBe(
        true,
      );
    });

    it("should handle nested directories within api folder", async () => {
      await resetTestProject(setupTestProjectWithNestedDirs);
      const { endpointEntries } = await discoverAPIs();

      expect(endpointEntries.length).toBeGreaterThanOrEqual(3);
      expect(endpointEntries.some((e) => e.route === "/api/root")).toBe(true);
      expect(endpointEntries.some((e) => e.route === "/api/v1/api")).toBe(true);
      expect(
        endpointEntries.some((e) => e.route === "/api/v1/users/list"),
      ).toBe(true);
    });

    it("should return Path objects with correct absolute paths", async () => {
      const { endpointEntries } = await discoverAPIs();

      for (const entry of endpointEntries) {
        expect(entry.file.absolute).toBeTruthy();
        expect(entry.file.absolute).toContain(API_DIR);
      }
    });

    it("should handle endpoints with special characters in their names", async () => {
      await resetTestProject(setupTestProjectWithSpecialChars);
      const { endpointEntries } = await discoverAPIs();

      expect(endpointEntries.length).toBe(2);
      expect(endpointEntries.some((e) => e.route === "/api/user-profile")).toBe(
        true,
      );
      expect(endpointEntries.some((e) => e.route === "/api/api_v2")).toBe(true);
    });

    it("should only discover exports that are APIEndpoint instances", async () => {
      await resetTestProject(setupTestProjectWithNonEndpointExports);
      const { endpointEntries } = await discoverAPIs();

      // Should find GET and POST from mixed.ts, but not helperFunction or config
      expect(endpointEntries.length).toBe(2);
      expect(endpointEntries.some((e) => e.method === "GET")).toBe(true);
      expect(endpointEntries.some((e) => e.method === "POST")).toBe(true);
    });

    it("should correctly parse route names from file paths", async () => {
      const { endpointEntries } = await discoverAPIs();

      const usersEndpoints = endpointEntries.filter((e) =>
        e.route.includes("users"),
      );
      expect(usersEndpoints.length).toBeGreaterThan(0);

      for (const usersEndpoint of usersEndpoints) {
        expect(usersEndpoint.route).toMatch(/^\/api\/users$/);
      }
    });

    it("should preserve input and output schemas", async () => {
      const { endpointEntries } = await discoverAPIs();

      const usersGetEndpoint = endpointEntries.find(
        (e) => e.route.includes("users") && e.method === "GET",
      );

      expect(usersGetEndpoint).toBeDefined();
      expect(usersGetEndpoint?.input).toBeDefined();
      expect(usersGetEndpoint?.output).toBeDefined();
    });

    it("should have the route shortened if filename is index", async () => {
      await resetTestProject(setupTestProjectWithIndexEndpoint);

      const { endpointEntries } = await discoverAPIs();

      expect(endpointEntries.some((e) => e.route === "/api/health")).toBeTrue();
    });
  });

  describe("generateAPIFile", () => {
    const utilsFile = () => path.resolve(TEST_DIR, ".cache", "api.ts");

    it("should generate the exact expected file for an empty endpoints list", async () => {
      await generateAPIFile({ endpointEntries: [] });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toBe(`// Auto-generated by noxt
import { getApiHandlers } from "noxt/runtime";
import type { InferDefinitions } from "noxt/api";


const apiRoutesData = {
  
} as const;
const handlers = getApiHandlers(apiRoutesData, "");

type ApiRoutes = InferDefinitions<typeof apiRoutesData>;

export { type ApiRoutes, handlers };
`);
    });

    it("should generate import and apiRoutesData for a single controlled endpoint", async () => {
      const usersFile = path.join(TEST_DIR, "src", "api", "users.ts");
      await generateAPIFile({
        endpointEntries: [createEntry("GET", "/api/users", usersFile)],
      });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toMatch(
        new RegExp(
          `import \\{ GET as _api_users_GET \\} from ${escapeRegExp(JSON.stringify(path.resolve(usersFile)))};`,
        ),
      );
      expect(content).toMatch(
        /const apiRoutesData = \{\n  "\/api\/users": \{\n    "GET": _api_users_GET\n  \}\n\} as const;/,
      );
    });

    it("should generate one import per file and merge methods in apiRoutesData", async () => {
      const usersFile = path.join(TEST_DIR, "src", "api", "users.ts");
      const postsFile = path.join(TEST_DIR, "src", "api", "posts.ts");
      await generateAPIFile({
        endpointEntries: [
          createEntry("GET", "/api/users", usersFile),
          createEntry("POST", "/api/users", usersFile),
          createEntry("GET", "/api/posts", postsFile),
          createEntry("DELETE", "/api/posts", postsFile),
        ],
      });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toMatch(
        new RegExp(
          `import \\{ GET as _api_users_GET, POST as _api_users_POST \\} from ${escapeRegExp(JSON.stringify(path.resolve(usersFile)))};`,
        ),
      );
      expect(content).toMatch(
        new RegExp(
          `import \\{ GET as _api_posts_GET, DELETE as _api_posts_DELETE \\} from ${escapeRegExp(JSON.stringify(path.resolve(postsFile)))};`,
        ),
      );
      expect(content).toMatch(
        /const apiRoutesData = \{\n  "\/api\/users": \{\n    "GET": _api_users_GET,\n    "POST": _api_users_POST\n  \},\n  "\/api\/posts": \{\n    "GET": _api_posts_GET,\n    "DELETE": _api_posts_DELETE\n  \}\n\} as const;/,
      );
    });

    it("should generate imports matching discovered endpoints", async () => {
      const { endpointEntries } = await discoverAPIs();
      await generateAPIFile({ endpointEntries });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toMatch(
        /import \{ GET as _api_health_GET \} from "[^"]+health\.ts";/,
      );
      expect(content).toMatch(
        /import \{ GET as _api_posts_GET, POST as _api_posts_POST, DELETE as _api_posts_DELETE \} from "[^"]+posts\.ts";/,
      );
      expect(content).toMatch(
        /import \{ GET as _api_users_GET, POST as _api_users_POST \} from "[^"]+users\.ts";/,
      );
    });

    it("should generate the full apiRoutesData for discovered endpoints", async () => {
      const { endpointEntries } = await discoverAPIs();
      await generateAPIFile({ endpointEntries });

      const content = await Bun.file(utilsFile()).text();
      expect(content).toContain(`const apiRoutesData = {
  "/api/health": {
    "GET": _api_health_GET
  },
  "/api/posts": {
    "GET": _api_posts_GET,
    "POST": _api_posts_POST,
    "DELETE": _api_posts_DELETE
  },
  "/api/users": {
    "GET": _api_users_GET,
    "POST": _api_users_POST
  }
} as const;`);
    });

    it("should create cache directory if it doesn't exist", async () => {
      const { endpointEntries } = await discoverAPIs();
      await generateAPIFile({ endpointEntries });

      const cacheDir = path.resolve(TEST_DIR, ".cache");
      expect(await exists(cacheDir)).toBe(true);
    });

    it("should overwrite existing API file", async () => {
      const { endpointEntries } = await discoverAPIs();

      await mkdir(path.dirname(utilsFile()), { recursive: true });
      await writeFile(utilsFile(), "to overwrite");
      await generateAPIFile({ endpointEntries });
      const content = await Bun.file(utilsFile()).text();

      expect(content).not.toBe("to overwrite");
    });
  });
});
