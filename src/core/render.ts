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
import { options } from "preact";
import { renderToStringAsync } from "preact-render-to-string";

declare module "preact" {
  interface Options {
    /** Enables error boundary support in preact-render-to-string. */
    errorBoundaries?: boolean;
  }
}

/**
 * Renders a Preact tree to an HTML string.
 *
 * Enables preact-render-to-string error boundaries for the duration of the
 * render, so islands that throw during server-side rendering (e.g. because
 * they rely on browser-only features) are caught by their error boundary and
 * fall back to client-only hydration instead of failing the whole page.
 */
export async function renderToHtmlString(vnode: any): Promise<string> {
  const previousErrorBoundaries = options.errorBoundaries;
  options.errorBoundaries = true;
  try {
    return await renderToStringAsync(vnode);
  } finally {
    options.errorBoundaries = previousErrorBoundaries;
  }
}