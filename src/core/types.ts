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
import { Path } from "./fs";

export interface RouteData {
  url: string;
  file: Path;
}

export interface FileEntry {
  url: string;
  file: Path;
}

type MaybePromise<T> = T | Promise<T>;

export class BuildPipeline<TContext extends {}> {
  private constructor(private _fn: () => MaybePromise<TContext>) {}

  then<TNewContext extends TContext>(
    action: (context: TContext) => MaybePromise<TNewContext>,
  ): BuildPipeline<TNewContext> {
    return new BuildPipeline(async () => action(await this._fn()));
  }

  with<TAdditionalContext extends {}>(
    action: (context: TContext) => MaybePromise<TAdditionalContext>,
  ): BuildPipeline<TContext & TAdditionalContext> {
    return new BuildPipeline(async () => {
      const context = await this._fn();
      const additionalContext = await action(context);
      return { ...context, ...additionalContext };
    });
  }

  build(): MaybePromise<TContext> {
    return this._fn();
  }

  static newPipeline(): BuildPipeline<{}> {
    return new BuildPipeline(() => ({}));
  }
}
