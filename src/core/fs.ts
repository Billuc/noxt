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
import path from "node:path";

export class RelativePath {
  constructor(
    public fromRoot: string,
    public absolute: string,
  ) { }

  static fromCwd(absolute: string): RelativePath {
    return new RelativePath(path.relative(process.cwd(), absolute), absolute);
  }

  static fromRelative(rel: string): RelativePath {
    return new RelativePath(rel, path.resolve(rel));
  }
}
