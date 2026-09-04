import { useContext } from "preact/hooks";
import { UtilsContext } from "noxt/runtime";
import type { AssetId } from "../../.cache/assets";
import type { RouteId } from "../../.cache/utils";

export function useUtilsContext() {
  const { page: basePage, asset: baseAsset } = useContext(UtilsContext);
  const asset = baseAsset<AssetId>;
  const page = basePage<RouteId>;

  return { asset, page };
}
