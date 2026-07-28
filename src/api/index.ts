import { z } from "zod";
import type { APIEndpoint, APIEndpointDef } from "./types";
import { jsonCodec, searchParamCodec, type SearchParamObjectSchema } from "./zod";

export function get<
  TInput extends SearchParamObjectSchema,
  TOutput extends z.ZodObject,
>(
  {input, output, handler}: APIEndpointDef<TInput, TOutput>,
): APIEndpoint<TInput, TOutput> {
    const inputCodec = searchParamCodec(input);
    const outputCodec = jsonCodec(output);

    return {
        input,
        output,
        handler: async (request) => {
            const searchParams = new URL(request.url).searchParams;
            const searchParamsRecord: Record<string, string[]> = {};

            for (const key of searchParams.keys()) {
                searchParamsRecord[key] = searchParams.getAll(key);    
            }
            
            const inputData = inputCodec.decode(searchParamsRecord);
            const response: ResponseInit = {}

            const result = await handler({ input: inputData, request, response })

            const body = outputCodec.encode(result as any);
            return new Response(body, response);
        }
    }
}

export function post<
  TInput extends z.ZodObject,
  TOutput extends z.ZodObject,
>(
  {input, output, handler}: APIEndpointDef<TInput, TOutput>,
): APIEndpoint<TInput, TOutput> {
    const inputCodec = jsonCodec(input);
    const outputCodec = jsonCodec(output);

    return {
        input,
        output,
        handler: async (request) => {
            const inputData = inputCodec.decode(await request.text());
            const response: ResponseInit = {}

            const result = await handler({ input: inputData, request, response })

            const body = outputCodec.encode(result as any);
            return new Response(body, response);
        }
    }
}
