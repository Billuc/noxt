import { serverRender } from "./src/runtime/server";
import { getAssetPath } from "./src/core/assets";
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
import { type NoxtConfig } from "./src/core/config";
import { prepareManifest } from "./index.macro";

export {
  prepareImportMap,
  serverRender,
  getAssetPath,
  useFetchHtml,
  prepareManifest,
};
export type {
  UseFetchHtmlOptions,
  UseFetchHtmlReturn,
  SwapStrategy,
  FetchError,
  HttpMethod,
  FormDataFormat,
  NoxtConfig,
};
