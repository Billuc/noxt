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
import type { IslandData } from "../shell/island";

/**
 * Generates pure JavaScript code for an island wrapper component.
 *
 * This function creates template code that renders a placeholder div with:
 * - data-island attribute containing the island hash
 * - data-props attribute with JSON-stringified props
 * - script tag to load the island's client-side code
 *
 * @param islandData - Island metadata (hash, prerender path)
 * @returns JavaScript code as a string
 */
export function generateIslandWrapperCode(islandData: IslandData): string {
  return `
    import { html } from "htm/preact";
    return (props) => html\`
      <div data-island="${islandData.hash}" data-props="\${JSON.stringify(props)}"></div>
      <script type="module" src="${islandData.prerenderPath}"></script>
    \`;
  `;
}

/**
 * Generates pure JavaScript code for the import map.
 *
 * This function creates template code that exports a prepareImportMap() function
 * which returns a mapping of route names to their HTML bundles.
 *
 * @param manifest - Record mapping route names to prerendered HTML file paths
 * @returns JavaScript code as a string
 */
export function generateImportMapCode(
  manifest: Record<string, string>,
): string {
  const imports: string[] = [];
  const mapCode: string[] = [];

  for (const route in manifest) {
    const sanitizedRouteName = route.replaceAll(/\W/, "_");
    imports.push(
      `import ${sanitizedRouteName} from ${JSON.stringify(manifest[route])};`,
    );
    mapCode.push(`"${route}": ${sanitizedRouteName}`);
  }

  return `
    ${imports.join("\n")}

    export async function prepareImportMap() {
      return {${mapCode.join(",\n")}};
    }
  `;
}
