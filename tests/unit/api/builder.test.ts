import { describe, it, expect } from "bun:test";
import { query, mutation } from "../../../src/api/builder";
import * as v from "valibot";

function assertSchemaMatch<TExpected extends v.GenericSchema>(
  received: v.GenericSchema,
  expected: TExpected,
) {
  const receivedEntries = Object.entries(received)
    .filter(([k, _]) => !k.startsWith("~"))
    .sort();
  const expectedEntries = Object.entries(expected)
    .filter(([k, _]) => !k.startsWith("~"))
    .sort();

  expect(receivedEntries).toEqual(expectedEntries);
}

describe("QueryEndpointBuilder", () => {
  describe("query()", () => {
    it("should create a builder with default empty input and null output", () => {
      const builder = query();
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._input, v.object({}));
      assertSchemaMatch(builder._output, v.null());
    });
  });

  describe("input()", () => {
    it("should set input schema", () => {
      const schema = v.object({ name: v.string() });
      const builder = query().input(schema);
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._input, schema);
    });

    it("should replace previous input calls", () => {
      const schema1 = v.object({ name: v.string() });
      const schema2 = v.object({ age: v.number() });
      const builder = query().input(schema1).input(schema2);
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._input, schema2);
    });
  });

  describe("output()", () => {
    it("should set output schema", () => {
      const schema = v.object({ result: v.string() });
      const builder = query().output(schema);
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._output, schema);
    });

    it("should replace previous output calls", () => {
      const schema1 = v.object({ result: v.string() });
      const schema2 = v.object({ success: v.boolean() });
      const builder = query().output(schema1).output(schema2);
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._output, schema2);
    });
  });

  describe("endpoint()", () => {
    it("should create an APIEndpoint with query method", async () => {
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ greeting: v.string() });

      const handler = query()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { greeting: `Hello, ${input.name}!` };
        });

      expect(handler).toBeDefined();
      assertSchemaMatch(handler.input, inputSchema);
      assertSchemaMatch(handler.output, outputSchema);
      expect(handler.handler).toBeDefined();
    });

    it("should handle valid request with search params", async () => {
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ greeting: v.string() });

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
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ greeting: v.string() });

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
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ greeting: v.string() });

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
      const inputSchema = v.object({ name: v.optional(v.string()) });
      const outputSchema = v.object({ greeting: v.string() });

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
      assertSchemaMatch(builder._input, v.null());
      assertSchemaMatch(builder._output, v.null());
    });
  });

  describe("input()", () => {
    it("should set input schema", () => {
      const schema = v.object({ name: v.string() });
      const builder = mutation().input(schema);
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._input, schema);
    });

    it("should replace previous input calls", () => {
      const schema1 = v.object({ name: v.string() });
      const schema2 = v.object({ age: v.number() });
      const builder = mutation().input(schema1).input(schema2);
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._input, schema2);
    });
  });

  describe("output()", () => {
    it("should set output schema", () => {
      const schema = v.object({ result: v.string() });
      const builder = mutation().output(schema);
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._output, schema);
    });

    it("should replace previous output calls", () => {
      const schema1 = v.object({ result: v.string() });
      const schema2 = v.object({ success: v.boolean() });
      const builder = mutation().output(schema1).output(schema2);
      expect(builder).toBeDefined();
      assertSchemaMatch(builder._output, schema2);
    });
  });

  describe("endpoint()", () => {
    it("should create an APIEndpoint with mutation method", async () => {
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ result: v.string() });

      const handler = mutation()
        .input(inputSchema)
        .output(outputSchema)
        .endpoint(async ({ input }) => {
          return { result: `Created ${input.name}` };
        });

      expect(handler).toBeDefined();
      assertSchemaMatch(handler.input, inputSchema);
      assertSchemaMatch(handler.output, outputSchema);
      expect(handler.handler).toBeDefined();
    });

    it("should handle valid request with JSON body", async () => {
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ result: v.string() });

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
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ result: v.string() });

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
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ result: v.string() });

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
      const inputSchema = v.object({ name: v.string() });
      const outputSchema = v.object({ result: v.string() });

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
      const inputSchema = v.object({ age: v.number() });
      const outputSchema = v.object({ result: v.number() });

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
      const inputSchema = v.object({ active: v.boolean() });
      const outputSchema = v.object({ status: v.string() });

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
