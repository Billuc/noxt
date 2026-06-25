import { env } from "node:process";

export function isDev() {
  return env["NOXT_MODE"] === "dev";
}
