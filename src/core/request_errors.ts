import { StructError } from "superstruct";

/**
 * Logs a request failure with the method and path. Validation failures only
 * report the field and expected type, never the submitted value.
 */
export function logRequestError(
  message: string,
  request: Request,
  err: unknown,
): void {
  const where = `${request.method} ${new URL(request.url).pathname}`;
  if (err instanceof StructError) {
    const field = err.path.length > 0 ? err.path.join(".") : "(root)";
    console.error(
      `${message} for ${where}: invalid value at "${field}" (expected ${err.type}).`,
    );
    return;
  }
  console.error(`${message} for ${where}:`, err);
}
