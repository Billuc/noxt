import { createContext, h, type ComponentChildren, type FunctionComponent } from "preact";
import type { IslandEntry } from "./registry";

export const BaseContext = createContext("");

export function BaseProvider({
  value,
  children,
}: {
  value: string;
  children?: ComponentChildren;
}) {
  return h(BaseContext.Provider, { value }, children);
}

export const IslandMapContext = createContext<Map<FunctionComponent<any>, IslandEntry>>(new Map());

export function IslandMapProvider({
  entries,
  children,
}: {
  entries: IslandEntry[];
  children?: ComponentChildren;
}) {
  const map = new Map<FunctionComponent<any>, IslandEntry>();
  for (const entry of entries) {
    map.set(entry.component, entry);
  }
  return h(IslandMapContext.Provider, { value: map }, children);
}
