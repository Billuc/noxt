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
import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from "preact/hooks";
import { toBody, toSearchParam } from "../core/url";

/** Supported HTTP methods for fetch requests. */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/** Return type of the useFetch hook. */
export interface UseDataFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T | null>;
}

export type FetchRequestInit<TBody extends {} | [] = any> = {
  cache?: RequestCache;
  credentials?: RequestCredentials;
  headers?:
    | [string, string][]
    | {
        [x: string]: string;
      };
  integrity?: string;
  keepalive?: boolean;
  method?: string;
  mode?: RequestMode;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
} & { objectBody?: TBody };

export function copyFetchRequestInit(init: FetchRequestInit): FetchRequestInit {
  const result: FetchRequestInit = {};

  const headers = init.headers;
  result.headers =
    headers instanceof Array ? [...headers] : { ...(headers ?? {}) };

  result.cache = init.cache;
  result.credentials = init.credentials;
  result.integrity = init.integrity;
  result.keepalive = init.keepalive;
  result.method = init.method;
  result.mode = init.mode;
  result.objectBody = init.objectBody;
  result.redirect = init.redirect;
  result.referrer = init.referrer;
  result.referrerPolicy = init.referrerPolicy;

  return result;
}

export class FetchError extends Error {
  constructor(public response: Response) {
    super(`Error ${response.status}: ${response.statusText}`);
  }
}

export function requestFrom(
  url: string,
  initWithBody?: FetchRequestInit,
  signal?: AbortSignal,
): Request {
  const {
    headers = {},
    method = "GET",
    objectBody = undefined,
    ...rest
  } = initWithBody ?? {};

  const finalHeaders = new Headers(headers);
  const finalUrl =
    url.startsWith("http://") || url.startsWith("https://")
      ? new URL(url)
      : new URL(url, window.location.origin);
  let finalBody: BodyInit | null | undefined = undefined;

  if (!!objectBody) {
    if (method === "GET") {
      for (const [k, v] of toSearchParam(objectBody).entries()) {
        finalUrl.searchParams.append(k, v);
      }
    } else {
      finalBody = toBody(objectBody);
      finalHeaders.set("Content-Type", "application/x-devalue");
    }
  }

  return new Request(finalUrl, {
    body: finalBody,
    method: method,
    headers: finalHeaders,
    signal,
    ...rest,
  });
}

export function useAsync<TInput = any, TResult = any>(
  input: TInput,
  asyncFn: (input: TInput, signal: AbortSignal) => Promise<TResult>,
): UseDataFetchReturn<TResult> {
  const [data, setData] = useState<TResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Refs to track abort controller, latest options/url, and mount state across renders
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef(input);
  const mountedRef = useRef(true);

  const refresh = useCallback(async (): Promise<TResult | null> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const data = await asyncFn(
        inputRef.current,
        abortControllerRef.current.signal,
      );
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

  useEffect(() => {
    inputRef.current = input;
    refresh().catch(() => {});
  }, [input]);

  // Fetch data on mount and abort on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refresh };
}
