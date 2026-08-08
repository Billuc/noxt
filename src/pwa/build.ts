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
import { writeFile, distPath } from "../core/fs";
import { generateServiceWorkerCode } from "./code_generation";

export async function generateServiceWorker(
  manifest: Record<string, string>,
): Promise<string> {
  const code = generateServiceWorkerCode(manifest);
  const swPath = distPath("sw.js");
  await writeFile(swPath, code);
  console.log(`Generated service worker at ${swPath}`);
  return swPath;
}
