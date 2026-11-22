import { useContext } from "preact/hooks";
import type { ApiDefinitions } from "../api";
import type { SSRDefinitions } from "../ssr";
import { UtilsContext, type UtilsContextData } from "../core/context";

export interface NoxtContextDefinitions {}

type Definition<TKey extends string, TFallback> =
  TKey extends keyof NoxtContextDefinitions
    ? NoxtContextDefinitions[TKey]
    : TFallback;

type ApiContext = Definition<"api", ApiDefinitions> extends infer TApi extends
  ApiDefinitions
  ? TApi
  : ApiDefinitions;
type SSRContext = Definition<"ssr", SSRDefinitions> extends infer TSsr extends
  SSRDefinitions
  ? TSsr
  : SSRDefinitions;
type PageContext = Definition<"page", string> extends infer TPage extends string
  ? TPage
  : string;
type AssetContext = Definition<
  "asset",
  string
> extends infer TAsset extends string
  ? TAsset
  : string;

export function useUtilsContext(): UtilsContextData<
  ApiContext,
  SSRContext,
  PageContext,
  AssetContext
> {
  return useContext(UtilsContext);
}
