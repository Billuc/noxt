import * as v from "valibot";
import { fetchWithBody } from "./fetch";
import { useCallback, useLayoutEffect, useRef, useState } from "preact/hooks";

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

      const response = await fetchWithBody(
        url,
        {
          ...options,
          objectBody: input,
          method,
        },
        this.fetcher,
      );
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
  const [data, setData] = useState<v.InferInput<
    ApiDefinitions[TEndpoint]["output"]
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Refs to track abort controller, latest options/url, and mount state across renders
  const abortControllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  const inputRef = useRef(input);
  const mountedRef = useRef(true);

  optionsRef.current = options;
  inputRef.current = input;

  const refetch = useCallback(async (): Promise<v.InferInput<
    ApiDefinitions[TEndpoint]["output"]
  > | null> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const data = await endpointCaller(inputRef.current, optionsRef.current);
      if (mountedRef.current) {
        setData(data);
      }
      return data;
    } catch (err) {
      if (err instanceof Error) {
        if (err.name !== "AbortError") {
          setError(err);
          throw err;
        }
      } else {
        const error = Error(String(err));
        setError(error);
        throw error;
      }

      return null;
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch data on mount and abort on unmount
  useLayoutEffect(() => {
    mountedRef.current = true;
    refetch().catch(() => {});
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refetch };
}
