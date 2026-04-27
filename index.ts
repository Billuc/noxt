import { defineIsland } from "./src/island";
import {
  asIsland,
  prepareImportMap,
  serverRender,
  ServerComponent,
} from "./src/server";
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

export {
  defineIsland,
  asIsland,
  prepareImportMap,
  serverRender,
  ServerComponent,
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
