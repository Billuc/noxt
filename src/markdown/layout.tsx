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
import { h, type ComponentChildren, type ComponentType } from "preact";
import * as path from "node:path";

function DefaultMarkdownLayout({ children }: { children?: ComponentChildren }) {
  return (
    <html>
      <head></head>
      <body>{children}</body>
    </html>
  );
}

export async function getLayout(
  frontmatterData: Record<string, any>,
): Promise<ComponentType<Record<string, any>>> {
  let layoutPath = frontmatterData["layout"];
  if (!layoutPath) {
    return DefaultMarkdownLayout;
  }

  layoutPath = path.resolve(layoutPath);
  const layoutExports = await import(layoutPath);
  if (!layoutExports || !layoutExports["default"]) {
    throw new Error(
      `File ${layoutPath} does not have a default layout export !`,
    );
  }

  const Layout = layoutExports["default"];
  return Layout as ComponentType<Record<string, any>>;
}
