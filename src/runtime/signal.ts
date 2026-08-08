/**
 * Copyright 2026 Luc BILLAUD
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 **/
import { signal as preactSignal } from "@preact/signals";
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

export function sharedSignal<T>(
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
