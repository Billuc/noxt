import * as v from "valibot";
import { requestFrom, useDataFetch } from "./fetch";

type EndpointCaller<
  ApiDefinitions extends {
    [k: string]: {
      input: v.GenericSchema;
      output: v.GenericSchema;
    };
  },
  TEndpoint extends keyof ApiDefinitions,
> = (
  input: v.InferOutput<ApiDefinitions[TEndpoint]["input"]>,
  options?: RequestInit | undefined,
) => Promise<v.InferInput<ApiDefinitions[TEndpoint]["output"]>>;

export class ApiRouter<
  ApiDefinitions extends {
    [k: string]: {
      input: v.GenericSchema;
      output: v.GenericSchema;
    };
  },
> {
  constructor(
    private base?: string,
    private fetcher: (request: Request) => Promise<Response> = fetch,
  ) {}

  api<TEndpoint extends keyof ApiDefinitions>(
    endpoint: TEndpoint,
  ): EndpointCaller<ApiDefinitions, TEndpoint> {
    return async (input, options) => {
      let [method, url] = endpoint.toString().split(" ", 2);
      url = (this.base ?? "") + url;

      const request = requestFrom(url, {
        ...options,
        objectBody: input,
        method,
      });
      const response = await this.fetcher(request);
      const data = await response.json();

      return data as v.InferInput<ApiDefinitions[TEndpoint]["output"]>;
    };
  }
}

export function useApi<
  ApiDefinitions extends {
    [k: string]: {
      input: v.GenericSchema;
      output: v.GenericSchema;
    };
  },
  TEndpoint extends keyof ApiDefinitions,
>(
  endpointCaller: EndpointCaller<ApiDefinitions, TEndpoint>,
  input: v.InferOutput<ApiDefinitions[TEndpoint]["input"]>,
  options?: RequestInit,
) {
  return useDataFetch(
    { input, options },
    async ({ input, options }, signal) => {
      return endpointCaller(input, { ...options, signal });
    },
  );
}
