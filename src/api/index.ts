import type {
  APIEndpoint,
  APIEndpointDef,
  SearchParamSchema,
  SomeSchema,
} from "./types";
import { toBody } from "./utils";
import { body, searchParams } from "./valibot";
import * as v from "valibot";

export function get<
  TInput extends SearchParamSchema,
  TOutput extends SomeSchema,
>({
  input,
  output,
  handler,
}: APIEndpointDef<TInput, TOutput>): APIEndpoint<TInput, TOutput> {
  return {
    input,
    output,
    handler: async (request) => {
      try {
        const params = new URL(request.url).searchParams;
        const inputData = v.parse(searchParams(input), params);

        try {
          const response: ResponseInit = {};
          const result = await handler({ input: inputData, request, response });
          const body = toBody(result);
          return new Response(body, response);
        } catch {
          return new Response("Internal Server Error", { status: 500 });
        }
      } catch {
        return new Response("Bad argument", { status: 400 });
      }
    },
  };
}

export function post<TInput extends SomeSchema, TOutput extends SomeSchema>({
  input,
  output,
  handler,
}: APIEndpointDef<TInput, TOutput>): APIEndpoint<TInput, TOutput> {
  return {
    input,
    output,
    handler: async (request) => {
      try {
        const data = await request.text();
        const inputData = v.parse(body(input), data);

        try {
          const response: ResponseInit = {};
          const result = await handler({ input: inputData, request, response });
          const responseBody = toBody(result);
          return new Response(responseBody, response);
        } catch {
          return new Response("Internal Server Error", { status: 500 });
        }
      } catch {
        return new Response("Bad argument", { status: 400 });
      }
    },
  };
}
