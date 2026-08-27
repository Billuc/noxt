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
import {
  APIEndpoint,
  type APIHandler,
  type IMutationEndpointBuilder,
  type IQueryEndpointBuilder,
  type Schema,
  type SearchParams,
  type SearchParamSchema,
} from "./types";
import { toBody } from "./utils";
import { body, searchParams } from "./superstruct";
import * as s from "superstruct";

class QueryEndpointBuilder<
  TInput extends SearchParams,
  TOutput,
> implements IQueryEndpointBuilder<TInput, TOutput> {
  constructor(
    private __input: SearchParamSchema<TInput>,
    private __output: Schema<TOutput>,
  ) {}

  input<TInput2 extends SearchParams>(
    Input: SearchParamSchema<TInput2>,
  ): IQueryEndpointBuilder<TInput2, TOutput> {
    return new QueryEndpointBuilder(Input, this.__output);
  }

  output<TOutput2>(
    Output: Schema<TOutput2>,
  ): IQueryEndpointBuilder<TInput, TOutput2> {
    return new QueryEndpointBuilder(this.__input, Output);
  }

  get _input(): Schema<TInput> {
    return this.__input;
  }
  get _output(): Schema<TOutput> {
    return this.__output;
  }

  endpoint(fn: APIHandler<TInput, TOutput>): APIEndpoint<TInput, TOutput> {
    return new APIEndpoint(this.__input, this.__output, async (request) => {
      try {
        const params = new URL(request.url).searchParams;
        const inputData = s.create(params, searchParams(this.__input));

        try {
          const response: ResponseInit = {};
          const result = await fn({
            input: inputData,
            request,
            response,
          });
          const body = toBody(result);
          return new Response(body, response);
        } catch (err) {
          console.error(err);
          return new Response("Internal Server Error", { status: 500 });
        }
      } catch (err) {
        console.error(err);
        return new Response("Bad argument", { status: 400 });
      }
    });
  }
}

export function query(): IQueryEndpointBuilder<{}, null> {
  return new QueryEndpointBuilder(s.object({}), s.literal(null));
}

class MutationEndpointBuilder<
  TInput,
  TOutput,
> implements IMutationEndpointBuilder<TInput, TOutput> {
  constructor(
    private __input: Schema<TInput>,
    private __output: Schema<TOutput>,
  ) {}

  input<TInput2>(
    Input: Schema<TInput2>,
  ): IMutationEndpointBuilder<TInput2, TOutput> {
    return new MutationEndpointBuilder(Input, this.__output);
  }

  output<TOutput2>(
    Output: Schema<TOutput2>,
  ): IMutationEndpointBuilder<TInput, TOutput2> {
    return new MutationEndpointBuilder(this.__input, Output);
  }

  get _input(): Schema<TInput> {
    return this.__input;
  }
  get _output(): Schema<TOutput> {
    return this.__output;
  }

  endpoint(fn: APIHandler<TInput, TOutput>): APIEndpoint<TInput, TOutput> {
    return new APIEndpoint(this.__input, this.__output, async (request) => {
      try {
        const data = await request.text();
        const inputData = s.create(data, body(this.__input));

        try {
          const response: ResponseInit = {};
          const result = await fn({ input: inputData, request, response });
          const responseBody = toBody(result);
          return new Response(responseBody, response);
        } catch {
          return new Response("Internal Server Error", { status: 500 });
        }
      } catch {
        return new Response("Bad argument", { status: 400 });
      }
    });
  }
}

export function mutation(): IMutationEndpointBuilder<null, null> {
  return new MutationEndpointBuilder(s.literal(null), s.literal(null));
}
