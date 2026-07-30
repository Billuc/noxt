import * as v from "valibot";

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

export interface APIEndpoint<
  TInput extends SomeSchema,
  TOutput extends SomeSchema,
> {
  input: TInput;
  output: TOutput;
  handler: (request: Request) => Promise<Response>;
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

  endpoint(
    fn: APIHandler<v.InferOutput<TInput>, v.InferInput<TOutput>>,
  ): APIEndpoint<TInput, TOutput>;
}
