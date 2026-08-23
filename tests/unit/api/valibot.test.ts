import { describe, it, expect } from "bun:test";
import { searchParams, body } from "../../../src/api/valibot";
import * as v from "valibot";

describe("searchParams", () => {
  describe("basic functionality", () => {
    it("should parse string search param", () => {
      const schema = v.object({ name: v.string() });
      const params = new URLSearchParams("name=John");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ name: "John" });
    });

    it("should parse number search param", () => {
      const schema = v.object({ age: v.number() });
      const params = new URLSearchParams("age=25");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ age: 25 });
    });

    it("should parse boolean search param", () => {
      const schema = v.object({ active: v.boolean() });
      const params = new URLSearchParams("active=true");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ active: true });
    });

    it("should parse bigint search param", () => {
      const schema = v.object({ id: v.bigint() });
      const params = new URLSearchParams("id=12345678901234567890");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ id: BigInt("12345678901234567890") });
    });
  });

  describe("array search params", () => {
    it("should parse array of strings", () => {
      const schema = v.object({ tags: v.array(v.string()) });
      const params = new URLSearchParams("tags=a&tags=b&tags=c");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ tags: ["a", "b", "c"] });
    });

    it("should parse array of numbers", () => {
      const schema = v.object({ scores: v.array(v.number()) });
      const params = new URLSearchParams("scores=1&scores=2&scores=3");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ scores: [1, 2, 3] });
    });

    it("should parse array of booleans", () => {
      const schema = v.object({ flags: v.array(v.boolean()) });
      const params = new URLSearchParams("flags=true&flags=false&flags=true");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ flags: [true, false, true] });
    });

    it("should handle empty array", () => {
      const schema = v.object({ tags: v.array(v.string()) });
      const params = new URLSearchParams("");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ tags: [] });
    });

    it("should handle single array value", () => {
      const schema = v.object({ tags: v.array(v.string()) });
      const params = new URLSearchParams("tags=single");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ tags: ["single"] });
    });
  });

  describe("optional search params", () => {
    it("should handle optional string param present", () => {
      const schema = v.object({ name: v.optional(v.string()) });
      const params = new URLSearchParams("name=John");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ name: "John" });
    });

    it("should handle optional string param absent", () => {
      const schema = v.object({ name: v.optional(v.string()) });
      const params = new URLSearchParams("");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({});
    });

    it("should handle optional number param", () => {
      const schema = v.object({ age: v.optional(v.number()) });
      const params = new URLSearchParams("age=25");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ age: 25 });
    });

    it("should handle optional boolean param", () => {
      const schema = v.object({ active: v.optional(v.boolean()) });
      const params = new URLSearchParams("active=true");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ active: true });
    });
  });

  describe("mixed schemas", () => {
    it("should handle multiple params with different types", () => {
      const schema = v.object({
        name: v.string(),
        age: v.number(),
        active: v.boolean(),
      });
      const params = new URLSearchParams("name=John&age=25&active=true");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ name: "John", age: 25, active: true });
    });

    it("should handle mixed params with arrays and optionals", () => {
      const schema = v.object({
        name: v.string(),
        tags: v.array(v.string()),
        description: v.optional(v.string()),
      });
      const params = new URLSearchParams("name=John&tags=a&tags=b");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ name: "John", tags: ["a", "b"] });
    });
  });

  describe("error handling", () => {
    it("should throw for missing required param", () => {
      const schema = v.object({ name: v.string() });
      const params = new URLSearchParams("");

      expect(() => v.parse(searchParams(schema), params)).toThrow();
    });

    it("should throw for invalid number format", () => {
      const schema = v.object({ age: v.number() });
      const params = new URLSearchParams("age=invalid");

      expect(() => v.parse(searchParams(schema), params)).toThrow();
    });

    it("should handle invalid boolean format as false", () => {
      const schema = v.object({ active: v.boolean() });
      const params = new URLSearchParams("active=invalid");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ active: false });
    });

    it("should throw for invalid bigint format", () => {
      const schema = v.object({ id: v.bigint() });
      const params = new URLSearchParams("id=invalid");

      expect(() => v.parse(searchParams(schema), params)).toThrow();
    });

    it("should throw for invalid array element type", () => {
      const schema = v.object({ scores: v.array(v.number()) });
      const params = new URLSearchParams("scores=1&scores=invalid");

      expect(() => v.parse(searchParams(schema), params)).toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle URL encoded params", () => {
      const schema = v.object({ name: v.string() });
      const params = new URLSearchParams("name=John%20Doe");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ name: "John Doe" });
    });

    it("should handle plus sign in params", () => {
      const schema = v.object({ name: v.string() });
      const params = new URLSearchParams("name=John+Doe");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ name: "John Doe" });
    });

    it("should handle empty string param", () => {
      const schema = v.object({ name: v.string() });
      const params = new URLSearchParams("name=");

      expect(v.parse(searchParams(schema), params)).toEqual({ name: "" });
    });

    it("should handle numeric string for number", () => {
      const schema = v.object({ age: v.number() });
      const params = new URLSearchParams("age=25.5");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ age: 25.5 });
    });

    it("should handle extra params not in schema", () => {
      const schema = v.object({ name: v.string() });
      const params = new URLSearchParams("name=John&extra=value");

      const result = v.parse(searchParams(schema), params);
      expect(result).toEqual({ name: "John" });
    });
  });
});

describe("body", () => {
  describe("basic functionality", () => {
    it("should parse JSON string to object", () => {
      const schema = v.object({ name: v.string(), age: v.number() });
      const jsonString = JSON.stringify({ name: "John", age: 25 });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ name: "John", age: 25 });
    });

    it("should parse string field", () => {
      const schema = v.object({ name: v.string() });
      const jsonString = JSON.stringify({ name: "John" });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ name: "John" });
    });

    it("should parse number field", () => {
      const schema = v.object({ age: v.number() });
      const jsonString = JSON.stringify({ age: 25 });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ age: 25 });
    });

    it("should parse boolean field", () => {
      const schema = v.object({ active: v.boolean() });
      const jsonString = JSON.stringify({ active: true });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ active: true });
    });

    it("should parse null field", () => {
      const schema = v.object({ name: v.nullable(v.string()) });
      const jsonString = JSON.stringify({ name: null });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ name: null });
    });
  });

  describe("nested objects", () => {
    it("should parse nested object", () => {
      const schema = v.object({
        user: v.object({
          name: v.string(),
          age: v.number(),
        }),
      });
      const jsonString = JSON.stringify({ user: { name: "John", age: 25 } });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ user: { name: "John", age: 25 } });
    });

    it("should parse deeply nested object", () => {
      const schema = v.object({
        user: v.object({
          profile: v.object({
            name: v.string(),
          }),
        }),
      });
      const jsonString = JSON.stringify({
        user: { profile: { name: "John" } },
      });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ user: { profile: { name: "John" } } });
    });
  });

  describe("arrays", () => {
    it("should parse array of strings", () => {
      const schema = v.array(v.string());
      const jsonString = JSON.stringify(["a", "b", "c"]);

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual(["a", "b", "c"]);
    });

    it("should parse array of numbers", () => {
      const schema = v.array(v.number());
      const jsonString = JSON.stringify([1, 2, 3]);

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should parse array of objects", () => {
      const schema = v.array(v.object({ name: v.string() }));
      const jsonString = JSON.stringify([{ name: "John" }, { name: "Jane" }]);

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual([{ name: "John" }, { name: "Jane" }]);
    });

    it("should parse empty array", () => {
      const schema = v.array(v.string());
      const jsonString = JSON.stringify([]);

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual([]);
    });
  });

  describe("optional fields", () => {
    it("should parse with optional field present", () => {
      const schema = v.object({ name: v.optional(v.string()) });
      const jsonString = JSON.stringify({ name: "John" });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ name: "John" });
    });

    it("should parse with optional field absent", () => {
      const schema = v.object({ name: v.optional(v.string()) });
      const jsonString = JSON.stringify({});

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({});
    });
  });

  describe("error handling", () => {
    it("should throw for invalid JSON", () => {
      const schema = v.object({ name: v.string() });
      const invalidJson = "not valid json";

      expect(() => v.parse(body(schema), invalidJson)).toThrow();
    });

    it("should throw for missing required field", () => {
      const schema = v.object({ name: v.string() });
      const jsonString = JSON.stringify({});

      expect(() => v.parse(body(schema), jsonString)).toThrow();
    });

    it("should throw for invalid type", () => {
      const schema = v.object({ age: v.number() });
      const jsonString = JSON.stringify({ age: "not a number" });

      expect(() => v.parse(body(schema), jsonString)).toThrow();
    });

    it("should throw for extra fields if schema is strict", () => {
      const schema = v.strictObject({ name: v.string() });
      const jsonString = JSON.stringify({ name: "John", extra: "value" });

      expect(() => v.parse(body(schema), jsonString)).toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle empty object", () => {
      const schema = v.object({});
      const jsonString = JSON.stringify({});

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({});
    });

    it("should handle empty string", () => {
      const schema = v.object({ name: v.string() });
      const jsonString = JSON.stringify({ name: "" });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ name: "" });
    });

    it("should handle special characters in strings", () => {
      const schema = v.object({ text: v.string() });
      const jsonString = JSON.stringify({ text: "Hello \n World \t!" });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ text: "Hello \n World \t!" });
    });

    it("should handle unicode characters", () => {
      const schema = v.object({ text: v.string() });
      const jsonString = JSON.stringify({ text: "Hello 世界!" });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ text: "Hello 世界!" });
    });

    it("should handle very large numbers", () => {
      const schema = v.object({ value: v.number() });
      const jsonString = JSON.stringify({ value: 1.7976931348623157e308 });

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ value: 1.7976931348623157e308 });
    });

    it("should handle whitespace in JSON", () => {
      const schema = v.object({ name: v.string() });
      const jsonString = '  {  "name"  :  "John"  }  ';

      const result = v.parse(body(schema), jsonString);
      expect(result).toEqual({ name: "John" });
    });
  });
});
