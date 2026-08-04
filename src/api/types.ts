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
import * as v from "valibot";

export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

type SearchParamValueSchema =
  | v.NumberSchema<any>
  | v.BigintSchema<any>
  | v.BooleanSchema<any>
  | v.StringSchema<any>;

export type SearchParamSchema = v.ObjectSchema<
  {
    [k: string]:
      | SearchParamValueSchema
      | v.ArraySchema<SearchParamValueSchema, any>
      | v.OptionalSchema<SearchParamValueSchema, any>;
  },
  any
>;

export type SomeSchema = v.GenericSchema<unknown>;

export type APIHandler<TInput, TOutput> = (data: {
  input: TInput;
  request: Request;
  response: ResponseInit;
}) => Promise<TOutput> | TOutput;

export class APIEndpoint<
  TInput extends SomeSchema,
  TOutput extends SomeSchema,
> {
  constructor(
    public input: TInput,
    public output: TOutput,
    public handler: (request: Request) => Promise<Response>,
  ) {}
}

export interface IQueryEndpointBuilder<
  TInput extends SearchParamSchema,
  TOutput extends SomeSchema,
> {
  input<TInput2 extends SearchParamSchema>(
    Input: TInput2,
  ): IQueryEndpointBuilder<TInput2, TOutput>;

  output<TOutput2 extends SomeSchema>(
    Output: TOutput2,
  ): IQueryEndpointBuilder<TInput, TOutput2>;

  get _input(): TInput;
  get _output(): TOutput;

  endpoint(
    fn: APIHandler<v.InferOutput<TInput>, v.InferInput<TOutput>>,
  ): APIEndpoint<TInput, TOutput>;
}

export interface IMutationEndpointBuilder<
  TInput extends SomeSchema,
  TOutput extends SomeSchema,
> {
  input<TInput2 extends SomeSchema>(
    Input: TInput2,
  ): IMutationEndpointBuilder<TInput2, TOutput>;

  output<TOutput2 extends SomeSchema>(
    Output: TOutput2,
  ): IMutationEndpointBuilder<TInput, TOutput2>;

  get _input(): TInput;
  get _output(): TOutput;

  endpoint(
    fn: APIHandler<v.InferOutput<TInput>, v.InferInput<TOutput>>,
  ): APIEndpoint<TInput, TOutput>;
}
