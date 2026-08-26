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

export const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

type SearchParamValue = number | boolean | string;

export type SearchParams = {
  [k: string]: SearchParamValue | SearchParamValue[] | undefined;
};
export type Structify<T> = {
  [k in keyof T]: s.Struct<T[k]>;
};

export type Schema<T> = s.Struct<T, Structify<T>>;
export type SearchParamSchema<T extends SearchParams> = Schema<T>;

export type SomeSchema = s.Struct<any, any>;

export type APIHandler<TInput, TOutput> = (data: {
  input: TInput;
  request: Request;
  response: ResponseInit;
}) => Promise<TOutput> | TOutput;

export class APIEndpoint<TInput extends {}, TOutput extends {}> {
  constructor(
    public input: Schema<TInput>,
    public output: Schema<TOutput>,
    public handler: (request: Request) => Promise<Response>,
  ) {}
}

export interface IQueryEndpointBuilder<
  TInput extends SearchParams,
  TOutput extends {},
> {
  input<TInput2 extends SearchParams>(
    Input: SearchParamSchema<TInput2>,
  ): IQueryEndpointBuilder<TInput2, TOutput>;

  output<TOutput2 extends {}>(
    Output: Schema<TOutput2>,
  ): IQueryEndpointBuilder<TInput, TOutput2>;

  get _input(): Schema<TInput>;
  get _output(): Schema<TOutput>;

  endpoint(fn: APIHandler<TInput, TOutput>): APIEndpoint<TInput, TOutput>;
}

export interface IMutationEndpointBuilder<
  TInput extends SearchParams,
  TOutput extends {},
> {
  input<TInput2 extends SearchParams>(
    Input: SearchParamSchema<TInput2>,
  ): IMutationEndpointBuilder<TInput2, TOutput>;

  output<TOutput2 extends {}>(
    Output: Schema<TOutput2>,
  ): IMutationEndpointBuilder<TInput, TOutput2>;

  get _input(): Schema<TInput>;
  get _output(): Schema<TOutput>;

  endpoint(fn: APIHandler<TInput, TOutput>): APIEndpoint<TInput, TOutput>;
}

export type ApiDefinitions = Record<
  string,
  Partial<
    Record<
      HttpMethod,
      {
        input: s.Struct<any, any>;
        output: s.Struct<any, any>;
      }
    >
  >
>;

export type InferDefinitions<TDefinitions extends ApiDefinitions> = {
  [K in keyof TDefinitions]: {
    [M in keyof TDefinitions[K]]: TDefinitions[K][M] extends {
      input: infer Input;
      output: infer Output;
    }
      ? {
          input: Input;
          output: Output;
        }
      : never;
  };
};

export type ApiEndpointDefinitions = Record<
  string,
  Partial<
    Record<HttpMethod, APIEndpoint<s.Struct<any, any>, s.Struct<any, any>>>
  >
>;

export type ApiEndpoints<TDefinitions extends ApiEndpointDefinitions> = {
  [route in keyof TDefinitions]: {
    [method in keyof TDefinitions[route]]: (
      request: Request,
    ) => Promise<Response>;
  };
};

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
