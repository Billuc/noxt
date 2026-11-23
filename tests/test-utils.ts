import assert from "node:assert/strict";
import { before, mock } from "node:test";

export { before as beforeAll };
export { afterEach, beforeEach, describe, it } from "node:test";

type Procedure = (...args: any[]) => any;
type MockContext<T extends Procedure> = {
  calls: Parameters<T>[];
  readonly lastCall: Parameters<T> | undefined;
};
export type MockFunction<T extends Procedure> = T & {
  mock: MockContext<T>;
  mockImplementation(implementation: T): MockFunction<T>;
  mockRestore(): void;
};

function isSubset(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== "object") {
    return Object.is(actual, expected);
  }

  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      expected.every((value, index) => isSubset(actual[index], value))
    );
  }

  if (actual === null || typeof actual !== "object") {
    return false;
  }

  return Object.entries(expected).every(([key, value]) =>
    isSubset((actual as Record<string, unknown>)[key], value),
  );
}

function errorMatches(
  error: unknown,
  expected?: string | RegExp | Error,
): boolean {
  if (expected === undefined) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (typeof expected === "string") {
    return message.includes(expected);
  }
  if (expected instanceof RegExp) {
    return new RegExp(expected.source, expected.flags).test(message);
  }
  return error instanceof Error && error.message === expected.message;
}

class RejectionExpectation {
  constructor(private readonly value: unknown) {}

  async toThrow(expected?: string | RegExp | Error): Promise<void> {
    try {
      await this.value;
    } catch (error) {
      assert.ok(
        errorMatches(error, expected),
        `Expected promise to reject with ${String(expected)}, but rejected with ${String(error)}`,
      );
      return;
    }
    assert.fail("Expected promise to reject");
  }
}

class ResolutionExpectation<T> {
  constructor(private readonly value: unknown) {}

  async toBe(expected: Awaited<T>): Promise<void> {
    expect(await this.value).toBe(expected);
  }
}

class Expectation<T> {
  private inverted = false;

  constructor(private readonly actual: T) {}

  get not(): this {
    const negated = new Expectation(this.actual);
    negated.inverted = !this.inverted;
    return negated as this;
  }

  get rejects(): RejectionExpectation {
    return new RejectionExpectation(this.actual);
  }

  get resolves(): ResolutionExpectation<T> {
    return new ResolutionExpectation(this.actual);
  }

  private check(condition: boolean, message: string): void {
    assert.equal(condition, !this.inverted, message);
  }

  toBe(expected: unknown): void {
    this.check(
      Object.is(this.actual, expected),
      `Expected ${String(this.actual)} to ${this.inverted ? "not " : ""}be ${String(expected)}`,
    );
  }

  toEqual(expected: unknown): void {
    this.check(
      assertValuesEqual(this.actual, expected),
      `Values ${this.inverted ? "unexpectedly " : ""}differ`,
    );
  }

  toBeDefined(): void {
    this.check(this.actual !== undefined, "Expected value to be defined");
  }

  toBeUndefined(): void {
    this.check(this.actual === undefined, "Expected value to be undefined");
  }

  toBeNull(): void {
    this.check(this.actual === null, "Expected value to be null");
  }

  toBeTruthy(): void {
    this.check(Boolean(this.actual), "Expected value to be truthy");
  }

  toBeGreaterThan(expected: number): void {
    this.check(
      typeof this.actual === "number" && this.actual > expected,
      `Expected ${String(this.actual)} to be greater than ${expected}`,
    );
  }

  toBeGreaterThanOrEqual(expected: number): void {
    this.check(
      typeof this.actual === "number" && this.actual >= expected,
      `Expected ${String(this.actual)} to be at least ${expected}`,
    );
  }

  toBeInstanceOf(expected: Function): void {
    this.check(
      this.actual instanceof (expected as new (...args: any[]) => object),
      `Expected value to be an instance of ${expected.name}`,
    );
  }

  toBeTypeOf(expected: string): void {
    this.check(
      typeof this.actual === expected,
      `Expected value to have type ${expected}`,
    );
  }

  toContain(expected: unknown): void {
    const actual = this.actual as { includes(value: unknown): boolean };
    this.check(
      typeof actual?.includes === "function" && actual.includes(expected),
      `Expected value to contain ${String(expected)}`,
    );
  }

  toHaveLength(expected: number): void {
    this.check(
      (this.actual as { length?: number } | null)?.length === expected,
      `Expected length to be ${expected}`,
    );
  }

  toHaveProperty(property: PropertyKey): void {
    this.check(
      this.actual !== null &&
        this.actual !== undefined &&
        Object.hasOwn(Object(this.actual), property),
      `Expected value to have property ${String(property)}`,
    );
  }

  toMatch(expected: RegExp): void {
    const expression = new RegExp(expected.source, expected.flags);
    this.check(
      typeof this.actual === "string" && expression.test(this.actual),
      `Expected string to match ${String(expected)}`,
    );
  }

  toMatchObject(expected: unknown): void {
    this.check(isSubset(this.actual, expected), "Objects do not partially match");
  }

  toHaveBeenCalledWith(...expected: unknown[]): void {
    const calls = (this.actual as MockFunction<Procedure> | undefined)?.mock
      ?.calls;
    this.check(
      calls?.some((call) => assertValuesEqual(call, expected)) === true,
      `Expected mock to have been called with ${String(expected)}`,
    );
  }

  toThrow(expected?: string | RegExp | Error): void {
    if (typeof this.actual !== "function") {
      assert.fail("Expected a function to throw");
    }

    let thrown: unknown;
    try {
      this.actual();
    } catch (error) {
      thrown = error;
    }

    this.check(
      thrown !== undefined && errorMatches(thrown, expected),
      `Expected function to throw ${String(expected ?? "")}`,
    );
  }
}

function assertValuesEqual(actual: unknown, expected: unknown): boolean {
  try {
    assert.deepEqual(
      normalizeUndefinedProperties(actual),
      normalizeUndefinedProperties(expected),
    );
    return true;
  } catch {
    return false;
  }
}

function normalizeUndefinedProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeUndefinedProperties);
  }
  if (value === null || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, normalizeUndefinedProperties(entry)]),
  );
}

export function expect<T>(actual: T): Expectation<T> {
  return new Expectation(actual);
}

function createMock<T extends Procedure>(implementation: T): MockFunction<T> {
  let tracked = mock.fn(implementation);
  const wrapped = function (this: unknown, ...args: Parameters<T>) {
    return tracked.apply(this, args);
  } as MockFunction<T>;
  const context: MockContext<T> = {
    calls: [],
    get lastCall() {
      return this.calls.at(-1);
    },
  };

  Object.defineProperty(wrapped, "mock", { value: context });
  const mocked = new Proxy(wrapped, {
    apply(target, thisArg, argumentsList) {
      const result = Reflect.apply(target, thisArg, argumentsList);
      context.calls.push(argumentsList as Parameters<T>);
      return result;
    },
  });
  mocked.mockImplementation = (nextImplementation) => {
    tracked = mock.fn(nextImplementation);
    return mocked;
  };
  mocked.mockRestore = () => {};
  return mocked;
}

function spyOn<T extends object, K extends keyof T>(
  target: T,
  property: K,
): T[K] extends Procedure ? MockFunction<T[K]> : never {
  const original = target[property];
  if (typeof original !== "function") {
    throw new TypeError(`${String(property)} is not a function`);
  }

  const spy = createMock(original as T[K] & Procedure);
  spy.mockRestore = () => {
    target[property] = original;
  };
  target[property] = spy as T[K];
  return spy as T[K] extends Procedure ? MockFunction<T[K]> : never;
}

export const vi = {
  fn: createMock,
  spyOn,
  async waitFor(assertion: () => unknown, timeout = 1000): Promise<void> {
    const deadline = Date.now() + timeout;
    let lastError: unknown;

    do {
      try {
        await assertion();
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    } while (Date.now() < deadline);

    throw lastError;
  },
};
