import type { BuildConfig } from "bun";

export async function prepareScript(
  entrypoints: string[],
  outdir: string,
  options: BuildConfig,
) {
  return await Bun.build({
    ...options,
    entrypoints,
    outdir,
  });
}
