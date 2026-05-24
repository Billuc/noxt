import { serverRender } from "./src/core/server";
import {
  useFetchHtml,
  type UseFetchHtmlOptions,
  type UseFetchHtmlReturn,
  type SwapStrategy,
  type HttpMethod,
  type FormDataFormat,
  type FetchError,
} from "./src/runtime/fetch";
import { prepareIsland } from "./src/shell/island";
import { prepareRoutes } from "./index.macro";
import { defineIsland } from "./src/core/island";

export {
  serverRender,
  useFetchHtml,
  prepareIsland,
  prepareRoutes,
  defineIsland,
};
export type {
  UseFetchHtmlOptions,
  UseFetchHtmlReturn,
  SwapStrategy,
  FetchError,
  HttpMethod,
  FormDataFormat,
};
