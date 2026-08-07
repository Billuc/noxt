import { describe, it, expect } from "bun:test";
import { toSearchParam, toBody, getRoutes } from "../../../src/api/utils";
import * as v from "valibot";
import { APIEndpoint } from "../../../src/api/types";

describe("toSearchParam", () => {
  describe("string values", () => {
    it("should handle single string value", () => {
      const result = toSearchParam({ name: "John" });
      expect(result).toEqual({ name: ["John"] });
    });

    it("should handle multiple string values", () => {
      const result = toSearchParam({ name: "John", age: "25" });
      expect(result).toEqual({ name: ["John"], age: ["25"] });
    });

    it("should handle empty string", () => {
      const result = toSearchParam({ name: "" });
      expect(result).toEqual({ name: [""] });
    });
  });

  describe("number values", () => {
    it("should handle integer", () => {
      const result = toSearchParam({ age: 25 });
      expect(result).toEqual({ age: ["25"] });
    });

    it("should handle float", () => {
      const result = toSearchParam({ price: 19.99 });
      expect(result).toEqual({ price: ["19.99"] });
    });

    it("should handle negative number", () => {
      const result = toSearchParam({ temp: -5 });
      expect(result).toEqual({ temp: ["-5"] });
    });

    it("should handle zero", () => {
      const result = toSearchParam({ count: 0 });
      expect(result).toEqual({ count: ["0"] });
    });
  });

  describe("bigint values", () => {
    it("should handle bigint", () => {
      const result = toSearchParam({ id: BigInt(123) });
      expect(result).toEqual({ id: ["123"] });
    });

    it("should handle negative bigint", () => {
      const result = toSearchParam({ id: BigInt(-123) });
      expect(result).toEqual({ id: ["-123"] });
    });
  });

  describe("boolean values", () => {
    it("should handle true", () => {
      const result = toSearchParam({ active: true });
      expect(result).toEqual({ active: ["true"] });
    });

    it("should handle false", () => {
      const result = toSearchParam({ active: false });
      expect(result).toEqual({ active: ["false"] });
    });
  });

  describe("array values", () => {
    it("should handle string array", () => {
      const result = toSearchParam({ tags: ["a", "b", "c"] });
      expect(result).toEqual({ tags: ["a", "b", "c"] });
    });

    it("should handle number array", () => {
      const result = toSearchParam({ scores: [1, 2, 3] });
      expect(result).toEqual({ scores: ["1", "2", "3"] });
    });

    it("should handle boolean array", () => {
      const result = toSearchParam({ flags: [true, false, true] });
      expect(result).toEqual({ flags: ["true", "false", "true"] });
    });

    it("should handle mixed array", () => {
      const result = toSearchParam({ mixed: [1, "hello", true] });
      expect(result).toEqual({ mixed: ["1", "hello", "true"] });
    });

    it("should handle nested array", () => {
      const result = toSearchParam({
        nested: [
          [1, 2],
          [3, 4],
        ],
      });
      expect(result).toEqual({ nested: ["1", "2", "3", "4"] });
    });

    it("should handle empty array", () => {
      const result = toSearchParam({ empty: [] });
      expect(result).toEqual({ empty: [] });
    });
  });

  describe("mixed values", () => {
    it("should handle mixed types", () => {
      const result = toSearchParam({
        name: "John",
        age: 25,
        active: true,
        score: 99.5,
        id: BigInt(123),
      });
      expect(result).toEqual({
        name: ["John"],
        age: ["25"],
        active: ["true"],
        score: ["99.5"],
        id: ["123"],
      });
    });

    it("should handle null and undefined values", () => {
      const result = toSearchParam({
        name: "John",
        missing: null,
        undefined: undefined,
      });
      expect(result).toEqual({
        name: ["John"],
        missing: [],
        undefined: [],
      });
    });

    it("should handle object values as empty array", () => {
      const result = toSearchParam({
        name: "John",
        obj: { nested: "value" },
      });
      expect(result).toEqual({
        name: ["John"],
        obj: [],
      });
    });

    it("should handle function values as empty array", () => {
      const result = toSearchParam({
        name: "John",
        fn: () => {},
      });
      expect(result).toEqual({
        name: ["John"],
        fn: [],
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty input", () => {
      const result = toSearchParam({});
      expect(result).toEqual({});
    });

    it("should not include non-enumerable properties", () => {
      const obj = Object.create({});
      Object.defineProperty(obj, "hidden", {
        value: "test",
        enumerable: false,
      });
      const result = toSearchParam(obj);
      expect(result).toEqual({});
    });

    it("should handle symbol values as empty array", () => {
      const symbol = Symbol("test");
      const result = toSearchParam({ sym: symbol });
      expect(result).toEqual({ sym: [] });
    });

    it("should handle NaN as string array", () => {
      const result = toSearchParam({ value: NaN });
      expect(result).toEqual({ value: ["NaN"] });
    });

    it("should handle Infinity as string array", () => {
      const result = toSearchParam({ value: Infinity });
      expect(result).toEqual({ value: ["Infinity"] });
    });
  });
});

describe("toBody", () => {
  describe("primitive values", () => {
    it("should handle string", () => {
      const result = toBody("hello");
      expect(result).toBe('"hello"');
    });

    it("should handle number", () => {
      const result = toBody(42);
      expect(result).toBe("42");
    });

    it("should handle boolean", () => {
      const result = toBody(true);
      expect(result).toBe("true");
    });

    it("should handle null", () => {
      const result = toBody(null);
      expect(result).toBe("null");
    });
  });

  describe("object values", () => {
    it("should handle simple object", () => {
      const result = toBody({ name: "John", age: 25 });
      expect(result).toBe('{"name":"John","age":25}');
    });

    it("should handle nested object", () => {
      const result = toBody({
        user: { name: "John", age: 25 },
        active: true,
      });
      expect(result).toBe('{"user":{"name":"John","age":25},"active":true}');
    });

    it("should handle array", () => {
      const result = toBody([1, 2, 3]);
      expect(result).toBe("[1,2,3]");
    });

    it("should handle array of objects", () => {
      const result = toBody([{ name: "John" }, { name: "Jane" }]);
      expect(result).toBe('[{"name":"John"},{"name":"Jane"}]');
    });
  });

  describe("edge cases", () => {
    it("should handle empty object", () => {
      const result = toBody({});
      expect(result).toBe("{}");
    });

    it("should handle empty array", () => {
      const result = toBody([]);
      expect(result).toBe("[]");
    });

    it("should throw for bigint", () => {
      expect(() => toBody(BigInt(123))).toThrow();
    });

    it("should handle date", () => {
      const date = new Date("2023-01-01T00:00:00.000Z");
      const result = toBody(date);
      expect(result).toBe('"2023-01-01T00:00:00.000Z"');
    });

    it("should handle undefined", () => {
      const result = toBody(undefined);
      expect(result).toBe(undefined);
    });

    it("should handle symbol", () => {
      const symbol = Symbol("test");
      const result = toBody(symbol);
      // Symbols are not serializable to JSON, so they return undefined
      expect(result).toBe(undefined);
    });

    it("should handle function", () => {
      const fn = () => {};
      const result = toBody(fn);
      // Functions are not serializable to JSON, so they return undefined
      expect(result).toBe(undefined);
    });

    it("should handle circular reference", () => {
      const obj: any = { name: "John" };
      obj.self = obj;
      // JSON.stringify will throw for circular references
      expect(() => toBody(obj)).toThrow();
    });
  });

  describe("getRoutes", () => {
    it("should extract handlers from API definitions", () => {
      const mockHandler = (request: Request) => Promise.resolve(new Response());
      const apiMap = {
        "/api/users": {
          GET: new APIEndpoint(v.object({}), v.object({}), mockHandler),
        },
      };

      const result = getRoutes(apiMap);

      expect(result).toEqual({
        "/api/users": {
          GET: mockHandler,
        },
      });
    });

    it("should handle multiple routes and methods", () => {
      const getHandler = (request: Request) => Promise.resolve(new Response());
      const postHandler = (request: Request) => Promise.resolve(new Response());
      const apiMap = {
        "/api/users": {
          GET: new APIEndpoint(v.object({}), v.object({}), getHandler),
          POST: new APIEndpoint(v.object({}), v.object({}), postHandler),
        },
        "/api/posts": {
          GET: new APIEndpoint(v.object({}), v.object({}), getHandler),
        },
      };

      const result = getRoutes(apiMap);

      expect(result).toEqual({
        "/api/users": {
          GET: getHandler,
          POST: postHandler,
        },
        "/api/posts": {
          GET: getHandler,
        },
      });
    });

    it("should handle empty API definitions", () => {
      const result = getRoutes({});
      expect(result).toEqual({});
    });

    it("should handle routes with no methods", () => {
      const apiMap = {
        "/api/users": {},
      };

      const result = getRoutes(apiMap);
      expect(result).toEqual({
        "/api/users": {},
      });
    });

    it("should preserve handler references", () => {
      const handler1 = (request: Request) => Promise.resolve(new Response());
      const handler2 = (request: Request) => Promise.resolve(new Response());
      const apiMap = {
        "/api/test": {
          GET: new APIEndpoint(v.object({}), v.object({}), handler1),
          POST: new APIEndpoint(v.object({}), v.object({}), handler2),
        },
      };

      const result = getRoutes(apiMap);

      expect(result["/api/test"].GET).toBe(handler1);
      expect(result["/api/test"].POST).toBe(handler2);
    });
  });
});
