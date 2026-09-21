import { useContext } from "preact/hooks";
import { UtilsContext } from "noxt/runtime";
import type { AssetId } from "../../.cache/assets";
import type { RouteId } from "../../.cache/pages";
import type { ApiRoutes } from "../../.cache/api";
import type { UtilsContextData } from "noxt";

export function useUtilsContext() {
  return useContext<UtilsContextData<ApiRoutes, RouteId, AssetId>>(
    UtilsContext,
  );
}
