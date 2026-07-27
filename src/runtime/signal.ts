import { signal as preactSignal, useSignal } from "@preact/signals";
import type { Signal, SignalOptions } from "@preact/signals-core";

declare global {
  interface Window {
    __NOXT_SIGNALS__?: Map<string, Signal>;
  }
}

const SERVER_STORE = new Map<string, Signal>();

function getStore(): Map<string, Signal> {
  if (typeof window !== "undefined") {
    return (window.__NOXT_SIGNALS__ ??= new Map());
  }
  return SERVER_STORE;
}

export function signal<T>(
  key: string,
  initialValue: T,
  options?: SignalOptions<T>,
): Signal<T> {
  const store = getStore();
  let sig = store.get(key);
  if (!sig) {
    sig = preactSignal(initialValue, options);
    store.set(key, sig);
  }
  return sig as Signal<T>;
}

export { useSignal };
