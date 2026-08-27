import { describe, it, expect } from "bun:test";
import { searchParams, body } from "../../../src/api/superstruct";
import * as s from "superstruct";

describe("searchParams", () => {
  describe("basic functionality", () => {
    it("should parse string search param", () => {
      const schema = s.object({ name: s.string() });
      const params = new URLSearchParams("name=John");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ name: "John" });
    });

    it("should parse number search param", () => {
      const schema = s.object({ age: s.number() });
      const params = new URLSearchParams("age=25");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ age: 25 });
    });

    it("should parse boolean search param", () => {
      const schema = s.object({ active: s.boolean() });
      const params = new URLSearchParams("active=true");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ active: true });
    });
  });

  describe("array search params", () => {
    it("should parse array of strings", () => {
      const schema = s.object({ tags: s.array(s.string()) });
      const params = new URLSearchParams("tags=a&tags=b&tags=c");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ tags: ["a", "b", "c"] });
    });

    it("should parse array of numbers", () => {
      const schema = s.object({ scores: s.array(s.number()) });
      const params = new URLSearchParams("scores=1&scores=2&scores=3");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ scores: [1, 2, 3] });
    });

    it("should parse array of booleans", () => {
      const schema = s.object({ flags: s.array(s.boolean()) });
      const params = new URLSearchParams("flags=true&flags=false&flags=true");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ flags: [true, false, true] });
    });

    it("should handle empty array", () => {
      const schema = s.object({ tags: s.array(s.string()) });
      const params = new URLSearchParams("");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ tags: [] });
    });

    it("should handle single array value", () => {
      const schema = s.object({ tags: s.array(s.string()) });
      const params = new URLSearchParams("tags=single");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ tags: ["single"] });
    });
  });

  describe("optional search params", () => {
    it("should handle optional string param present", () => {
      const schema = s.object({ name: s.optional(s.string()) });
      const params = new URLSearchParams("name=John");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ name: "John" });
    });

    it("should handle optional string param absent", () => {
      const schema = s.object({ name: s.optional(s.string()) });
      const params = new URLSearchParams("");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({});
    });

    it("should handle optional number param", () => {
      const schema = s.object({ age: s.optional(s.number()) });
      const params = new URLSearchParams("age=25");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ age: 25 });
    });

    it("should handle optional boolean param", () => {
      const schema = s.object({ active: s.optional(s.boolean()) });
      const params = new URLSearchParams("active=true");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ active: true });
    });
  });

  describe("mixed schemas", () => {
    it("should handle multiple params with different types", () => {
      const schema = s.object({
        name: s.string(),
        age: s.number(),
        active: s.boolean(),
      });
      const params = new URLSearchParams("name=John&age=25&active=true");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ name: "John", age: 25, active: true });
    });

    it("should handle mixed params with arrays and optionals", () => {
      const schema = s.object({
        name: s.string(),
        tags: s.array(s.string()),
        description: s.optional(s.string()),
      });
      const params = new URLSearchParams("name=John&tags=a&tags=b");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ name: "John", tags: ["a", "b"] });
    });
  });

  describe("error handling", () => {
    it("should throw for missing required param", () => {
      const schema = s.object({ name: s.string() });
      const params = new URLSearchParams("");

      expect(() => s.create(params, searchParams(schema))).toThrow();
    });

    it("should throw for invalid number format", () => {
      const schema = s.object({ age: s.number() });
      const params = new URLSearchParams("age=invalid");

      expect(() => s.create(params, searchParams(schema))).toThrow();
    });

    it("should handle invalid boolean format as false", () => {
      const schema = s.object({ active: s.boolean() });
      const params = new URLSearchParams("active=invalid");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ active: false });
    });

    it("should throw for invalid array element type", () => {
      const schema = s.object({ scores: s.array(s.number()) });
      const params = new URLSearchParams("scores=1&scores=invalid");

      expect(() => s.create(params, searchParams(schema))).toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle URL encoded params", () => {
      const schema = s.object({ name: s.string() });
      const params = new URLSearchParams("name=John%20Doe");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ name: "John Doe" });
    });

    it("should handle plus sign in params", () => {
      const schema = s.object({ name: s.string() });
      const params = new URLSearchParams("name=John+Doe");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ name: "John Doe" });
    });

    it("should handle empty string param", () => {
      const schema = s.object({ name: s.string() });
      const params = new URLSearchParams("name=");

      expect(s.create(params, searchParams(schema))).toEqual({ name: "" });
    });

    it("should handle numeric string for number", () => {
      const schema = s.object({ age: s.number() });
      const params = new URLSearchParams("age=25.5");

      const result = s.create(params, searchParams(schema));
      expect(result).toEqual({ age: 25.5 });
    });

    it("should handle extra params not in schema", () => {
      const schema = s.object({ name: s.string() });
      const params = new URLSearchParams("name=John&extra=value");

      const result = s.mask(params, searchParams(schema));
      expect(result).toEqual({ name: "John" });
    });
  });
});

describe("body", () => {
  describe("basic functionality", () => {
    it("should parse JSON string to object", () => {
      const schema = s.type({ name: s.string(), age: s.number() });
      const jsonString = JSON.stringify({ name: "John", age: 25 });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ name: "John", age: 25 });
    });

    it("should parse string field", () => {
      const schema = s.type({ name: s.string() });
      const jsonString = JSON.stringify({ name: "John" });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ name: "John" });
    });

    it("should parse number field", () => {
      const schema = s.type({ age: s.number() });
      const jsonString = JSON.stringify({ age: 25 });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ age: 25 });
    });

    it("should parse boolean field", () => {
      const schema = s.type({ active: s.boolean() });
      const jsonString = JSON.stringify({ active: true });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ active: true });
    });

    it("should parse null field", () => {
      const schema = s.type({ name: s.nullable(s.string()) });
      const jsonString = JSON.stringify({ name: null });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ name: null });
    });
  });

  describe("nested objects", () => {
    it("should parse nested object", () => {
      const schema = s.type({
        user: s.type({
          name: s.string(),
          age: s.number(),
        }),
      });
      const jsonString = JSON.stringify({ user: { name: "John", age: 25 } });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ user: { name: "John", age: 25 } });
    });

    it("should parse deeply nested object", () => {
      const schema = s.type({
        user: s.type({
          profile: s.type({
            name: s.string(),
          }),
        }),
      });
      const jsonString = JSON.stringify({
        user: { profile: { name: "John" } },
      });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ user: { profile: { name: "John" } } });
    });
  });

  describe("arrays", () => {
    it("should parse array of strings", () => {
      const schema = s.array(s.string());
      const jsonString = JSON.stringify(["a", "b", "c"]);

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should parse array of numbers", () => {
      const schema = s.array(s.number());
      const jsonString = JSON.stringify([1, 2, 3]);

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual([1, 2, 3]);
    });

    it("should parse array of objects", () => {
      const schema = s.array(s.type({ name: s.string() }));
      const jsonString = JSON.stringify([{ name: "John" }, { name: "Jane" }]);

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual([{ name: "John" }, { name: "Jane" }]);
    });

    it("should parse empty array", () => {
      const schema = s.array(s.string());
      const jsonString = JSON.stringify([]);

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual([]);
    });
  });

  describe("optional fields", () => {
    it("should parse with optional field present", () => {
      const schema = s.type({ name: s.optional(s.string()) });
      const jsonString = JSON.stringify({ name: "John" });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ name: "John" });
    });

    it("should parse with optional field absent", () => {
      const schema = s.type({ name: s.optional(s.string()) });
      const jsonString = JSON.stringify({});

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({});
    });
  });

  describe("error handling", () => {
    it("should throw for invalid JSON", () => {
      const schema = s.type({ name: s.string() });
      const invalidJson = "not valid json";

      expect(() => s.create(invalidJson, body(schema))).toThrow();
    });

    it("should throw for missing required field", () => {
      const schema = s.type({ name: s.string() });
      const jsonString = JSON.stringify({});

      expect(() => s.create(jsonString, body(schema))).toThrow();
    });

    it("should throw for invalid type", () => {
      const schema = s.type({ age: s.number() });
      const jsonString = JSON.stringify({ age: "not a number" });

      expect(() => s.create(jsonString, body(schema))).toThrow();
    });

    it("should throw for extra fields if schema is strict", () => {
      const schema = s.object({ name: s.string() });
      const jsonString = JSON.stringify({ name: "John", extra: "value" });

      expect(() => s.create(jsonString, body(schema))).toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle empty object", () => {
      const schema = s.type({});
      const jsonString = JSON.stringify({});

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({});
    });

    it("should handle empty string", () => {
      const schema = s.type({ name: s.string() });
      const jsonString = JSON.stringify({ name: "" });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ name: "" });
    });

    it("should handle special characters in strings", () => {
      const schema = s.type({ text: s.string() });
      const jsonString = JSON.stringify({ text: "Hello \n World \t!" });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ text: "Hello \n World \t!" });
    });

    it("should handle unicode characters", () => {
      const schema = s.type({ text: s.string() });
      const jsonString = JSON.stringify({ text: "Hello 世界!" });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ text: "Hello 世界!" });
    });

    it("should handle very large numbers", () => {
      const schema = s.type({ value: s.number() });
      const jsonString = JSON.stringify({ value: 1.7976931348623157e308 });

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ value: 1.7976931348623157e308 });
    });

    it("should handle whitespace in JSON", () => {
      const schema = s.type({ name: s.string() });
      const jsonString = '  {  "name"  :  "John"  }  ';

      const result = s.create(jsonString, body(schema));
      expect(result).toEqual({ name: "John" });
    });
  });
});
