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
import * as s from "superstruct";
import type { Path } from "../core/fs";
import type { HttpMethod, RouteDefinition, RouteHandlers } from "../core/types";
import type { ComponentChildren } from "preact";
import type {
  Schema,
  SearchParams,
  SearchParamSchema,
  SomeSchema,
} from "../core/superstruct";

export type SSRHandler<TInput> = (data: {
  input: TInput;
  request: Request;
  response: ResponseInit;
}) => Promise<ComponentChildren> | ComponentChildren;

export class SSRRoute<TInput> {
  constructor(
    public input: Schema<TInput>,
    public handler: (request: Request) => Promise<Response>,
  ) {}
}

export interface IQueryRouteBuilder<TInput extends SearchParams> {
  input<TInput2 extends SearchParams>(
    Input: SearchParamSchema<TInput2>,
  ): IQueryRouteBuilder<TInput2>;

  get _input(): Schema<TInput>;

  route(fn: SSRHandler<TInput>): SSRRoute<TInput>;
}

export interface IMutationRouteBuilder<TInput> {
  input<TInput2>(Input: Schema<TInput2>): IMutationRouteBuilder<TInput2>;

  get _input(): Schema<TInput>;

  route(fn: SSRHandler<TInput>): SSRRoute<TInput>;
}

export type SSRDefinitions = RouteDefinition<{
  input: s.Struct<any, any>;
}>;

export type SSRRouteDefinitions = RouteDefinition<SSRRoute<any>>;

export type SSRRoutes<
  TDefinitions extends SSRRouteDefinitions,
  TBase extends string = "",
> = RouteHandlers<{
  [k in keyof TDefinitions as `${TBase}${string & k}`]: TDefinitions[k];
}>;

export interface SSRRouteEntry<TInput extends SomeSchema> {
  method: HttpMethod;
  route: string;
  input: TInput;
  file: Path;
}
