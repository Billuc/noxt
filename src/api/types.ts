import { z } from "zod";

export type APIHandler<TInput, TOutput> = (data: {
    input: TInput;
    request: Request;
    response: ResponseInit;
}) => Promise<TOutput> | TOutput;

export interface APIEndpointDef<TInput, TOutput> {
    input: TInput;
    output: TOutput;
    handler: APIHandler<z.output<TInput>, z.input<TOutput>>;
};

export interface APIEndpoint<TInput, TOutput> {
    input: TInput;
    output: TOutput;
    handler: (request: Request) => Promise<Response>;
};
