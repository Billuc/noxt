import {
  APIEndpoint,
  type APIHandler,
  type IMutationEndpointBuilder,
  type IQueryEndpointBuilder,
  type SearchParamSchema,
  type SomeSchema,
} from "./types";
import { toBody } from "./utils";
import { body, searchParams } from "./valibot";
import * as v from "valibot";

class QueryEndpointBuilder<
  TInput extends SearchParamSchema,
  TOutput extends SomeSchema,
> implements IQueryEndpointBuilder<TInput, TOutput> {
  constructor(
    private _input: TInput,
    private _output: TOutput,
  ) {}

  input<TInput2 extends SearchParamSchema>(
    Input: TInput2,
  ): IQueryEndpointBuilder<TInput2, TOutput> {
    return new QueryEndpointBuilder(Input, this._output);
  }

  output<TOutput2 extends SomeSchema>(
    Output: TOutput2,
  ): IQueryEndpointBuilder<TInput, TOutput2> {
    return new QueryEndpointBuilder(this._input, Output);
  }

  endpoint(
    fn: APIHandler<v.InferOutput<TInput>, v.InferInput<TOutput>>,
  ): APIEndpoint<TInput, TOutput> {
    return new APIEndpoint(this._input, this._output, async (request) => {
      try {
        const params = new URL(request.url).searchParams;
        const inputData = v.parse(searchParams(this._input), params);

        try {
          const response: ResponseInit = {};
          const result = await fn({
            input: inputData,
            request,
            response,
          });
          const body = toBody(result);
          return new Response(body, response);
        } catch {
          return new Response("Internal Server Error", { status: 500 });
        }
      } catch {
        return new Response("Bad argument", { status: 400 });
      }
    });
  }
}

export function query(): IQueryEndpointBuilder<
  v.ObjectSchema<{}, undefined>,
  v.NullSchema<undefined>
> {
  return new QueryEndpointBuilder(v.object({}), v.null());
}

class MutationEndpointBuilder<
  TInput extends SomeSchema,
  TOutput extends SomeSchema,
> implements IMutationEndpointBuilder<TInput, TOutput> {
  constructor(
    private _input: TInput,
    private _output: TOutput,
  ) {}

  input<TInput2 extends SomeSchema>(
    Input: TInput2,
  ): IMutationEndpointBuilder<TInput2, TOutput> {
    return new MutationEndpointBuilder(Input, this._output);
  }

  output<TOutput2 extends SomeSchema>(
    Output: TOutput2,
  ): IMutationEndpointBuilder<TInput, TOutput2> {
    return new MutationEndpointBuilder(this._input, Output);
  }

  endpoint(
    fn: APIHandler<v.InferOutput<TInput>, v.InferInput<TOutput>>,
  ): APIEndpoint<TInput, TOutput> {
    return new APIEndpoint(this._input, this._output, async (request) => {
      try {
        const data = await request.text();
        const inputData = v.parse(body(this._input), data);

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

export function mutation(): IMutationEndpointBuilder<
  v.NullSchema<undefined>,
  v.NullSchema<undefined>
> {
  return new MutationEndpointBuilder(v.null(), v.null());
}
