import type { BuildConfig } from "bun";

export async function prepareScript(options: BuildConfig) {
  return await Bun.build(options);
}
