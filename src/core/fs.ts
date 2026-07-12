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

export class Path {
  constructor(public absolute: string) {}

  static create(absolute: string): Path {
    return new Path(absolute);
  }

  static resolve(relative: string): Path {
    return new Path(path.resolve(relative));
  }

  relativeToCwd(): string {
    return path.relative(process.cwd(), this.absolute);
  }

  relativeTo(base: string): string {
    return path.relative(path.resolve(base), this.absolute);
  }
}
