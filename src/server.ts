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
import path from "path";
import { h, type Attributes, type ComponentType } from "preact";
import { CACHE_ASSETS_DIR, relativeFromRoot } from "./paths";
import { html } from "htm/preact";
import { useRef, useEffect, useState } from "preact/hooks";
import { defineIsland, getIslandPath, type IslandComponent } from "./island";
import { renderToStringAsync } from "preact-render-to-string";
import { prepareImportMap as prepareIM } from "./import_map";

export const prepareImportMap = prepareIM;

async function prepareIslandScript(
  fullPath: string,
  hash: string,
): Promise<string> {
  const islandScriptPath = path.resolve(CACHE_ASSETS_DIR, `${hash}.js`);
  const renderScriptPath = path.join(__dirname, "render.ts");

  const script = `
    import { renderComponent } from ${JSON.stringify(renderScriptPath)};
    import Island from ${JSON.stringify(fullPath)};
    renderComponent(Island, ${JSON.stringify(hash)}); 
  `;

  await Bun.write(islandScriptPath, script);
  return islandScriptPath;
}

/**
 * Transforms a component into an interactive island for client-side hydration.
 *
 * Generates a hash from the component path, creates an island script file,
 * and returns a component that renders a div container with data attributes
 * for the island hash and props, along with a module script tag to load the island.
 *
 * @param island - The island component to convert into an interactive island
 * @returns A component that renders an island div with embedded script
 */
export async function asIsland<P>(
  island: IslandComponent<P>,
): Promise<ComponentType<P>> {
  const fullPath = getIslandPath(island);

  if (!fullPath) {
    throw new Error(
      "This component is not an island. Export it with defineIsland(Component, import.meta.path).",
    );
  }

  const hash = new Bun.CryptoHasher("sha256")
    .update(fullPath)
    .digest("base64url");
  const path = await prepareIslandScript(fullPath, hash);
  console.log(`Preparing island [${relativeFromRoot(fullPath)}]`);

  return (props: P) => html`
    <div data-island="${hash}" data-props="${JSON.stringify(props)}"></div>
    <script type="module" src="${path}"></script>
  `;
}

export async function serverRender<Props>(
  page: ComponentType<Props>,
  props: Attributes & Props,
) {
  const vnode = h(page, props, []);
  const body = await renderToStringAsync(vnode);
  const result = new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
  return result;
}

interface ServerComponentProps {
  action: string;
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
  loading?: ComponentType<{}>;
  counter?: number;
}

function _ServerComponent(props: ServerComponentProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [fetching, setFetching] = useState(false);
  const [counter, setCounter] = useState(props.counter ?? 1);

  async function doFetch() {
    if (fetching) return;

    setFetching(true);
    const res = await fetch(props.action, {
      method: props.method,
      body: props.body,
      headers: props.headers,
    });
    const htmlBody = await res.text();

    if (ref.current) {
      ref.current.innerHTML = htmlBody;
    }
    setFetching(false);
  }

  useEffect(() => {
    if (counter > 0) {
      doFetch();
    }
  }, [counter]);
  useEffect(() => {
    if (!props.counter) return;
    if (props.counter !== counter) {
      setCounter(props.counter);
    }
  }, [props.counter]);

  return html`<div ref=${ref}><${props.loading} /></div>`;
}

export const ServerComponent = defineIsland(_ServerComponent, import.meta.path);
