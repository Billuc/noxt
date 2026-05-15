import { serverRender } from "./src/runtime/server";
import { build, type BuildOptions } from "./src/buildtime/build";
import { prerender, type PrerenderOptions } from "./src/buildtime/prerender";
import { getAssetPath } from "./src/assets";
import {
  useFetchHtml,
  type UseFetchHtmlOptions,
  type UseFetchHtmlReturn,
  type SwapStrategy,
  type HttpMethod,
  type FormDataFormat,
  type FetchError,
} from "./src/runtime/fetch";
import { prepareImportMap } from "./src/shell/import_map";
import { buildConfig, type NoxtConfig } from "./src/core/config";

export {
  prepareImportMap,
  serverRender,
  build,
  prerender,
  getAssetPath,
  useFetchHtml,
};
export type {
  PrerenderOptions,
  BuildOptions,
  UseFetchHtmlOptions,
  UseFetchHtmlReturn,
  SwapStrategy,
  FetchError,
  HttpMethod,
  FormDataFormat,
  NoxtConfig,
};

if (import.meta.main) {
  const [action, ...args] = Bun.argv.slice(2);
  const config = buildConfig({});

  if (action === "build") {
    await build(config);
  } else if (action === "prerender") {
    await prerender(config);
  }
}
