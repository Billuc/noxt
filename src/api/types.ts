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

export type SomeSchema = v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>;

export type APIHandler<TInput, TOutput> = (data: {
  input: TInput;
  request: Request;
  response: ResponseInit;
}) => Promise<TOutput> | TOutput;

export interface APIEndpointDef<
  TInput extends SomeSchema,
  TOutput extends SomeSchema,
> {
  input: TInput;
  output: TOutput;
  handler: APIHandler<v.InferOutput<TInput>, v.InferInput<TOutput>>;
}

export interface APIEndpoint<TInput, TOutput> {
  input: TInput;
  output: TOutput;
  handler: (request: Request) => Promise<Response>;
}
