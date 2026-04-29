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
/**
 * Configuration options for Noxt framework.
 * This interface centralizes all configurable aspects of the Noxt application.
 */
export interface NoxtConfig {
  /** Root directory of the project. All other paths are resolved relative to this. */
  root: string;
  /** Directory containing page components. Each file becomes a route based on its path. */
  pagesDir: string;
  /** Directory containing island components. Components here are automatically processed for client-side hydration. */
  islandsDir: string;
  /** Directory for static assets (images, CSS, fonts, etc.). Assets are copied to .cache during build. */
  assetsDir: string;
}

/** Default configuration values for Noxt. */
const DEFAULT_OPTIONS: NoxtConfig = {
  root: process.cwd(),
  pagesDir: "src/pages",
  islandsDir: "src/islands",
  assetsDir: "src/assets",
};

/**
 * Creates a Noxt configuration object with sensible defaults.
 *
 * @param overrides - Partial configuration to override default values
 * @returns Complete NoxtConfig object with defaults merged with overrides
 *
 * @example
 * ```ts
 * import { buildConfig } from "noxt";
 *
 * const config = buildConfig({
 *   assetsDir: "src/public",
 * });
 * ```
 */
export function buildConfig(overrides: Partial<NoxtConfig>): NoxtConfig {
  return {
    ...DEFAULT_OPTIONS,
    ...overrides,
  };
}
