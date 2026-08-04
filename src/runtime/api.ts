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
import * as v from "valibot";
import { requestFrom, useAsync } from "./fetch";

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
  return useAsync({ input, options }, async ({ input, options }, signal) => {
    return endpointCaller(input, { ...options, signal });
  });
}
