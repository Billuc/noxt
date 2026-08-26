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
import { generateScriptForIsland } from "../../../src/islands/code_generation";
import { describe, it, expect } from "bun:test";

describe("generateScriptForIsland", () => {
  it("should generate script with correct import path and hash", () => {
    const hash = "testhash123";
    const importPath = "./components/MyIsland";
    const script = generateScriptForIsland(hash, importPath);

    expect(script).toContain("import { renderIsland } from");
    expect(script).toMatch(/runtime(\/|\\\\)island.ts/);
    expect(script).toContain('import Island from "./components/MyIsland";');
    expect(script).toContain('renderIsland(Island, "testhash123", "");');
  });

  it("should generate different scripts for different hashes", () => {
    const script1 = generateScriptForIsland("hash1", "./comp/A");
    const script2 = generateScriptForIsland("hash2", "./comp/A");
    expect(script1).not.toBe(script2);
  });

  it("should generate different scripts for different import paths", () => {
    const script1 = generateScriptForIsland("samehash", "./comp/A");
    const script2 = generateScriptForIsland("samehash", "./comp/B");
    expect(script1).not.toBe(script2);
  });
});
