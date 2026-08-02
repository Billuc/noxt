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
