import * as v from "valibot";
import { fetchWithBody } from "./fetch";

export class ApiRouter<
  ApiDefinitions extends {
    [k: string]: {
      input: v.GenericSchema;
      output: v.GenericSchema;
    };
  },
> {
  constructor(
    private definitions: ApiDefinitions,
    private base?: string,
  ) {}

  api<TEndpoint extends keyof ApiDefinitions>(
    endpoint: TEndpoint,
  ): (
    input: v.InferOutput<ApiDefinitions[TEndpoint]["input"]>,
    options?: RequestInit | undefined,
  ) => Promise<v.InferInput<ApiDefinitions[TEndpoint]["output"]>> {
    return async (input, options) => {
      let [method, url] = endpoint.toString().split(" ", 2);
      url = (this.base ?? "") + url;
      const response = await fetchWithBody(url, {
        ...options,
        objectBody: input,
        method,
      });
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
>(router: ApiRouter<ApiDefinitions>, endpoint: TEndpoint) {}
