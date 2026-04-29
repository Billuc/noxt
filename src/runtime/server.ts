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
import { h, type Attributes, type ComponentType } from "preact";
import { renderToStringAsync } from "preact-render-to-string";

/**
 * Renders a Preact component to HTML on the server.
 *
 * This function takes a page component and its props, renders it to an HTML string
 * using Preact's renderToStringAsync, and wraps the result in a Response object
 * with appropriate headers for serving HTML content.
 *
 * Note: Islands within the page are automatically processed by the build system.
 * The rendered HTML will include placeholder divs for islands with data attributes,
 * and script tags for client-side hydration.
 *
 * @param page - The Preact component to render
 * @param props - Props to pass to the component
 * @returns A Promise resolving to a Response object with the rendered HTML
 *
 * @example
 * ```ts
 * import { serverRender } from "noxt";
 * import MyPage from "./pages/index";
 *
 * const response = await serverRender(MyPage, { title: "Home" });
 * // response.status = 200
 * // response.headers.get("Content-Type") = "text/html"
 * // await response.text() = "<h1>Home</h1>..."
 * ```
 */
export async function serverRender<Props>(
  page: ComponentType<Props>,
  props: Attributes & Props,
) {
  // TODO: build islands
  const vnode = h(page, props, []);
  const body = await renderToStringAsync(vnode);
  const result = new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
  return result;
}
