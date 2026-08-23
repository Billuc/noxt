import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { rm } from "node:fs/promises";
import path from "node:path";

const FIXTURES_DIR = path.resolve("tests/fixtures");
const DIST_DIR = path.resolve(FIXTURES_DIR, "dist");
const CACHE_DIR = path.resolve(FIXTURES_DIR, ".cache");

async function cleanupFixtures() {
  await rm(DIST_DIR, { recursive: true, force: true }).catch(() => {});
  await rm(CACHE_DIR, { recursive: true, force: true }).catch(() => {});
}

describe("API E2E Tests", () => {
  let serverProcess: Bun.Subprocess | null = null;
  const TEST_PORT = 2102;

  beforeAll(async () => {
    await cleanupFixtures();

    // Build the project
    const buildCmd = Bun.spawn(["bun", "run", "build.ts"], {
      cwd: FIXTURES_DIR,
      stdout: "inherit",
    });
    await buildCmd.exited;
    expect(buildCmd.exitCode).toBe(0);
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    await Bun.sleep(200);
    await cleanupFixtures();
  });

  describe("API Endpoints", () => {
    beforeAll(async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
        env: { ...process.env, PORT: String(TEST_PORT) },
      });
      await Bun.sleep(500);
    });

    afterAll(async () => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      await Bun.sleep(200);
    });

    it("GET /api/users?id=1 should return user", async () => {
      const response = await fetch(
        `http://localhost:${TEST_PORT}/api/users?id=1`,
      );
      expect(response.status).toBe(200);
      const user = await response.json();
      expect(user).toEqual({
        id: "1",
        name: "John Doe",
        email: "john@example.com",
      });
    });

    it("GET /api/users?id=999 should return 404", async () => {
      const response = await fetch(
        `http://localhost:${TEST_PORT}/api/users?id=999`,
      );
      expect(response.status).toBe(404);
    });

    it("POST /api/users should create new user", async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New User", email: "new@example.com" }),
      });
      expect(response.status).toBe(200);
      const user = await response.json();
      expect(user.name).toBe("New User");
      expect(user.email).toBe("new@example.com");
      expect(user.id).toBeDefined();
    });

    it("PUT /api/users should update user", async () => {
      const response = await fetch(`http://localhost:${TEST_PORT}/api/users`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "1",
          name: "Updated Name",
          email: "updated@example.com",
        }),
      });
      expect(response.status).toBe(200);
      const user = await response.json();
      expect(user.name).toBe("Updated Name");
      expect(user.email).toBe("updated@example.com");
    });

    it("DELETE /api/users should delete user", async () => {
      // First create a user to delete
      const createRes = await fetch(`http://localhost:${TEST_PORT}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "To Delete",
          email: "delete@example.com",
        }),
      });
      const createdUser = await createRes.json();

      const response = await fetch(`http://localhost:${TEST_PORT}/api/users`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: createdUser.id }),
      });
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.success).toBe(true);

      // Verify user is deleted
      const getRes = await fetch(
        `http://localhost:${TEST_PORT}/api/users?id=${createdUser.id}`,
      );
      expect(getRes.status).toBe(404);
    });
  });

  describe("Page with Island using useApi", () => {
    let serverProcess: Bun.Subprocess | null = null;

    beforeAll(async () => {
      serverProcess = Bun.spawn(["bun", "run", "index.ts"], {
        cwd: FIXTURES_DIR,
        env: { ...process.env, PORT: String(TEST_PORT) },
      });
      await Bun.sleep(500);
    });

    afterAll(async () => {
      if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
      }
      await Bun.sleep(200);
    });

    it("should serve the API test page", async () => {
      const response = await fetch(
        `http://localhost:${TEST_PORT}/api_test_page`,
      );
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("API E2E Test Page");
      expect(body).toContain("User List (API Test)");
    });

    it("should include island in the page", async () => {
      const response = await fetch(
        `http://localhost:${TEST_PORT}/api_test_page`,
      );
      const body = await response.text();
      expect(body).toContain("data-island=");
      expect(body).toContain("User List (API Test)");
    });
  });
});
