import { defineIsland } from "./src/island";
import { asIsland, serverRender } from "./src/server";
import { build, type BuildOptions } from "./src/build";
import { prerender, type PrerenderOptions } from "./src/prerender";
import { getAssetPath } from "./src/assets";
import {
  useFetchHtml,
  type UseFetchHtmlOptions,
  type UseFetchHtmlReturn,
  type SwapStrategy,
  type HttpMethod,
  type FormDataFormat,
  type FetchError,
} from "./src/fetch";
import { prepareImportMap } from "./src/import_map";

export {
  defineIsland,
  asIsland,
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
};
