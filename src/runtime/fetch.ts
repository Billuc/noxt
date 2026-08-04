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
import { useState, useRef, useCallback, useLayoutEffect } from "preact/hooks";

/** Supported HTTP methods for fetch requests. */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/** Return type of the useFetch hook. */
export interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<T | null>;
}

export type RequestInitWithBody = RequestInit & { objectBody: any };

export function requestFrom(
  url: string,
  initWithBody?: RequestInitWithBody,
): Request {
  const {
    body = undefined,
    headers = {},
    method = "GET",
    objectBody = undefined,
    ...rest
  } = initWithBody ?? {};

  const finalHeaders =
    headers instanceof Headers ? headers : new Headers(headers);
  const finalUrl =
    url.startsWith("http://") || url.startsWith("https://")
      ? new URL(url)
      : new URL(url, window.location.origin);
  let finalBody: BodyInit | null | undefined = undefined;

  if (!!objectBody) {
    if (method === "GET") {
      for (const [k, v] of Object.entries(objectBody)) {
        const values = v instanceof Array ? v : [v];
        for (const value of values) {
          finalUrl.searchParams.append(k, String(value));
        }
      }
    } else {
      finalBody = JSON.stringify(body);
      finalHeaders.set("Content-Type", "application/json");
    }
  }

  return new Request(finalUrl, {
    body: finalBody,
    method: method,
    headers: finalHeaders,
    ...rest,
  });
}

export async function fetchWithBody(
  url: string,
  options?: RequestInitWithBody,
  fetcher: (request: Request) => Promise<Response> = fetch,
): Promise<Response> {
  const request = requestFrom(url, options);
  return await fetcher(request);
}

async function defaultFetch<T = any>(request: Request): Promise<T> {
  const response = await fetch(request);
  const data = (await response.json()) as T;
  return data;
}

interface Result<T> {
  data: T | null;
  error: Error | null;
}

export async function safeFetch<TInput = any, TResult = any>(
  request: TInput,
  fetcher: (request: TInput) => Promise<TResult>,
): Promise<Result<TResult>> {
  try {
    const data = await fetcher(request);
    return { data, error: null };
  } catch (err) {
    if (err instanceof Error) {
      if (err.name !== "AbortError") {
        return { data: null, error: err };
      }
    } else {
      const error = Error(String(err));
      return { data: null, error };
    }

    return { data: null, error: null };
  }
}

/** A hook that fetches JSON data from a URL with loading/error state and automatic re-fetch. */
export function useFetch<T = any>(
  url: string,
  options?: RequestInitWithBody,
  fetcher: (request: Request) => Promise<T> = defaultFetch,
): UseFetchReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Refs to track abort controller, latest options/url, and mount state across renders
  const abortControllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  const urlRef = useRef(url);
  const mountedRef = useRef(true);

  optionsRef.current = options;
  urlRef.current = url;

  const refetch = useCallback(async (): Promise<T | null> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const request = requestFrom(urlRef.current, {
        ...optionsRef.current,
        signal: abortControllerRef.current.signal,
        objectBody: optionsRef.current?.body,
      });
      const data = await fetcher(request);
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
