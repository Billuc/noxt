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
import { type NoxtConfig } from "./src/core/config";
import { prepareIsland } from "./src/shell/island";
import { prepareRoutes } from "./index.macro";
import Island from "./src/core/IslandRenderer";

export {
  serverRender,
  getAssetPath,
  useFetchHtml,
  prepareIsland,
  prepareRoutes,
  Island,
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
