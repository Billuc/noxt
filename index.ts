import {
  useFetch,
  type UseFetchOptions,
  type UseFetchReturn,
  type FetchError,
} from "./src/runtime/fetch";
import { prepareIsland } from "./src/shell/island";
import { prepareRoutes } from "./index.macro";
import { defineIsland } from "./src/core/island";

export {
  useFetch,
  prepareIsland,
  prepareRoutes,
  defineIsland,
};
export type {
  UseFetchOptions,
  UseFetchReturn,
  FetchError,
};
