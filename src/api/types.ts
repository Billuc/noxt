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
import type {
  Schema,
  SearchParams,
  SearchParamSchema,
  SomeSchema,
} from "../core/superstruct";
import type { FetchRequestInit } from "../runtime/fetch";

export type APIHandler<TInput, TOutput> = (data: {
  input: TInput;
  request: Request;
  response: ResponseInit;
}) => Promise<TOutput> | TOutput;

export class APIEndpoint<TInput, TOutput> {
  constructor(
    public input: Schema<TInput>,
    public output: Schema<TOutput>,
    public handler: (request: Request) => Promise<Response>,
  ) {}
}

export interface IQueryEndpointBuilder<TInput extends SearchParams, TOutput> {
  input<TInput2 extends SearchParams>(
    Input: SearchParamSchema<TInput2>,
  ): IQueryEndpointBuilder<TInput2, TOutput>;

  output<TOutput2>(
    Output: Schema<TOutput2>,
  ): IQueryEndpointBuilder<TInput, TOutput2>;

  get _input(): Schema<TInput>;
  get _output(): Schema<TOutput>;

  endpoint(fn: APIHandler<TInput, TOutput>): APIEndpoint<TInput, TOutput>;
}

export interface IMutationEndpointBuilder<TInput, TOutput> {
  input<TInput2>(
    Input: Schema<TInput2>,
  ): IMutationEndpointBuilder<TInput2, TOutput>;

  output<TOutput2>(
    Output: Schema<TOutput2>,
  ): IMutationEndpointBuilder<TInput, TOutput2>;

  get _input(): Schema<TInput>;
  get _output(): Schema<TOutput>;

  endpoint(fn: APIHandler<TInput, TOutput>): APIEndpoint<TInput, TOutput>;
}

export type ApiDefinitions = RouteDefinition<{
  input: s.Struct<any, any>;
  output: s.Struct<any, any>;
}>;

export type ApiEndpointDefinitions = RouteDefinition<APIEndpoint<any, any>>;

export type ApiEndpoints<
  TDefinitions extends ApiEndpointDefinitions,
  TBase extends string = "",
> = RouteHandlers<{
  [k in keyof TDefinitions as `${TBase}${string & k}`]: TDefinitions[k];
}>;

export interface APIEndpointEntry<
  TInput extends SomeSchema,
  TOutput extends SomeSchema,
> {
  method: HttpMethod;
  route: string;
  input: TInput;
  output: TOutput;
  file: Path;
}

type KeyOf<T> =
  T extends Record<infer K, any>
    ? K
    : T extends Partial<Record<any, any>>
      ? keyof T
      : string | number | symbol;

export type Route<TDefinitions extends ApiDefinitions> = KeyOf<TDefinitions>;
export type Method<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
> = KeyOf<TDefinitions[TRoute]>;

export type CallerInput<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
  TMethod extends Method<TDefinitions, TRoute>,
> = s.Infer<NonNullable<TDefinitions[TRoute][TMethod]>["input"]>;
type CallerOutput<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
  TMethod extends Method<TDefinitions, TRoute>,
> = s.Infer<NonNullable<TDefinitions[TRoute][TMethod]>["output"]>;
export type EndpointCaller<
  TDefinitions extends ApiDefinitions,
  TRoute extends Route<TDefinitions>,
  TMethod extends Method<TDefinitions, TRoute>,
> = (
  input: CallerInput<TDefinitions, TRoute, TMethod>,
  options?: FetchRequestInit | undefined,
  signal?: AbortSignal,
) => Promise<CallerOutput<TDefinitions, TRoute, TMethod>>;

export type ApiFunction<TDefinitions extends ApiDefinitions> = <
  TRoute extends Route<TDefinitions>,
  TMethod extends Method<TDefinitions, TRoute>,
>(
  route: TRoute,
  method: TMethod,
  fetcher?: (request: Request) => Promise<Response>,
) => EndpointCaller<TDefinitions, TRoute, TMethod>;
