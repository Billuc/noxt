import { describe, it, expect } from "bun:test";
import { query, mutation } from "../../../src/api/builder";
import * as s from "superstruct";

function assertStructMatch(
  received: s.Struct<any, any>,
  expected: s.Struct<any, any>,
) {
  // Compare type and schema structure loosely
  expect(received.type).toEqual(expected.type);
  // For literal null, check schema value
  if (expected.type === "literal") {
    expect((received as any).schema).toEqual((expected as any).schema);
    return;
  }
  // For object/type, compare keys
  const recvSchema = (received as any).schema;
  const expSchema = (expected as any).schema;
  if (recvSchema && expSchema && typeof recvSchema === "object" && typeof expSchema === "object") {
    // object schema is map, array schema is struct
    if (Array.isArray(recvSchema) || Array.isArray(expSchema)) {
      // not needed
    } else if (recvSchema !== null && !("type" in recvSchema)) {
      // object map
      expect(Object.keys(recvSchema).sort()).toEqual(Object.keys(expSchema).sort());
      return;
    }
  }
  // For array, compare item type
  if (received.type === "array" && expected.type === "array") {
    expect((received as any).schema.type).toEqual((expected as any).schema.type);
  }
}

describe("QueryEndpointBuilder", () => {
  describe("query()", () => {
    it("should create a builder with default empty input and null output", () => {
      const builder = query();
      expect(builder).toBeDefined();
      assertStructMatch(builder._input, s.object({}));
      assertStructMatch(builder._output, s.literal(null) as any);
    });
  });

  describe("input()", () => {
    it("should set input schema", () => {
      const schema = s.object({ name: s.string() });
      const builder = query().input(schema);
      expect(builder).toBeDefined();
      expect(builder._input).toBe(schema);
    });

    it("should replace previous input calls", () => {
      const schema1 = s.object({ name: s.string() });
      const schema2 = s.object({ age: s.number() });
      const builder = query().input(schema1).input(schema2);
      expect(builder).toBeDefined();
      expect(builder._input).toBe(schema2);
    });
  });

  describe("output()", () => {
    it("should set output schema", () => {
      const schema = s.object({ result: s.string() });
      const builder = query().output(schema);
      expect(builder).toBeDefined();
      expect(builder._output).toBe(schema);
    });

    it("should replace previous output calls", () => {
      const schema1 = s.object({ result: s.string() });
      const schema2 = s.object({ success: s.boolean() });
      const builder = query().output(schema1).output(schema2);
      expect(builder).toBeDefined();
      expect(builder._output).toBe(schema2);
    });
  });

  describe("endpoint()", () => {
    it("should create an APIEndpoint with query method", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ greeting: s.string() });

      const handler = query()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { greeting: `Hello, ${input.name}!` };
        });

      expect(handler).toBeDefined();
      expect(handler.input).toBe(inputSchema);
      expect(handler.output).toBe(outputSchema);
      expect(handler.handler).toBeDefined();
    });

    it("should handle valid request with search params", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ greeting: s.string() });

      const handler = query()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { greeting: `Hello, ${input.name}!` };
        });

      const request = new Request("http://localhost:3000/api/test?name=John");
      const response = await handler.handler(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ greeting: "Hello, John!" });
    });

    it("should return 400 for invalid search params", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ greeting: s.string() });

      const handler = query()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { greeting: `Hello, ${input.name}!` };
        });

      const request = new Request("http://localhost:3000/api/test");
      const response = await handler.handler(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad argument");
    });

    it("should return 500 when handler throws an error", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ greeting: s.string() });

      const handler = query()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input: _ }) => {
          throw new Error("Handler error");
        });

      const request = new Request("http://localhost:3000/api/test?name=John");
      const response = await handler.handler(request);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Internal Server Error");
    });

    it("should handle optional search params", async () => {
      const inputSchema = s.object({ name: s.optional(s.string()) });
      const outputSchema = s.object({ greeting: s.string() });

      const handler = query()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { greeting: `Hello, ${input.name ?? "World"}!` };
        });

      const request = new Request("http://localhost:3000/api/test");
      const response = await handler.handler(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ greeting: "Hello, World!" });
    });
  });
});

describe("MutationEndpointBuilder", () => {
  describe("mutation()", () => {
    it("should create a builder with default null input and null output", () => {
      const builder = mutation();
      expect(builder).toBeDefined();
      assertStructMatch(builder._input, s.literal(null) as any);
      assertStructMatch(builder._output, s.literal(null) as any);
    });
  });

  describe("input()", () => {
    it("should set input schema", () => {
      const schema = s.object({ name: s.string() });
      const builder = mutation().input(schema);
      expect(builder).toBeDefined();
      expect(builder._input).toBe(schema);
    });

    it("should replace previous input calls", () => {
      const schema1 = s.object({ name: s.string() });
      const schema2 = s.object({ age: s.number() });
      const builder = mutation().input(schema1).input(schema2);
      expect(builder).toBeDefined();
      expect(builder._input).toBe(schema2);
    });
  });

  describe("output()", () => {
    it("should set output schema", () => {
      const schema = s.object({ result: s.string() });
      const builder = mutation().output(schema);
      expect(builder).toBeDefined();
      expect(builder._output).toBe(schema);
    });

    it("should replace previous output calls", () => {
      const schema1 = s.object({ result: s.string() });
      const schema2 = s.object({ success: s.boolean() });
      const builder = mutation().output(schema1).output(schema2);
      expect(builder).toBeDefined();
      expect(builder._output).toBe(schema2);
    });
  });

  describe("endpoint()", () => {
    it("should create an APIEndpoint with mutation method", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ result: s.string() });

      const handler = mutation()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { result: `Created ${input.name}` };
        });

      expect(handler).toBeDefined();
      expect(handler.input).toBe(inputSchema);
      expect(handler.output).toBe(outputSchema);
      expect(handler.handler).toBeDefined();
    });

    it("should handle valid request with JSON body", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ result: s.string() });

      const handler = mutation()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { result: `Created ${input.name}` };
        });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ name: "John" }),
      });
      const response = await handler.handler(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ result: "Created John" });
    });

    it("should return 400 for invalid JSON body", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ result: s.string() });

      const handler = mutation()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { result: `Created ${input.name}` };
        });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await handler.handler(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad argument");
    });

    it("should return 400 for invalid JSON", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ result: s.string() });

      const handler = mutation()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { result: `Created ${input.name}` };
        });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: "not valid json",
      });
      const response = await handler.handler(request);

      expect(response.status).toBe(400);
      expect(await response.text()).toBe("Bad argument");
    });

    it("should return 500 when handler throws an error", async () => {
      const inputSchema = s.object({ name: s.string() });
      const outputSchema = s.object({ result: s.string() });

      const handler = mutation()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input: _ }) => {
          throw new Error("Handler error");
        });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ name: "John" }),
      });
      const response = await handler.handler(request);

      expect(response.status).toBe(500);
      expect(await response.text()).toBe("Internal Server Error");
    });

    it("should handle number input", async () => {
      const inputSchema = s.object({ age: s.number() });
      const outputSchema = s.object({ result: s.number() });

      const handler = mutation()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { result: input.age * 2 };
        });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ age: 25 }),
      });
      const response = await handler.handler(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ result: 50 });
    });

    it("should handle boolean input", async () => {
      const inputSchema = s.object({ active: s.boolean() });
      const outputSchema = s.object({ status: s.string() });

      const handler = mutation()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { status: input.active ? "active" : "inactive" };
        });

      const request = new Request("http://localhost:3000/api/test", {
        method: "POST",
        body: JSON.stringify({ active: true }),
      });
      const response = await handler.handler(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ status: "active" });
    });
  });
});
