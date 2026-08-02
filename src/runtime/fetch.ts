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

/** Options to configure a useFetch request. */
export interface UseFetchOptions<T> {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  initial?: T;
}

/** Return type of the useFetch hook. */
export interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  fetch: () => Promise<T | null>;
}

export type RequestInitWithBody = RequestInit & { objectBody: any };

export async function fetchWithBody<T>(
  url: string,
  options?: RequestInitWithBody,
): Promise<Response> {
  const {
    body = undefined,
    headers = {},
    method = "GET",
    objectBody = undefined,
  } = options ?? {};

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

  return await fetch(finalUrl, {
    ...options,
    headers: finalHeaders,
    body: finalBody,
  });
}

/** A hook that fetches JSON data from a URL with loading/error state and automatic re-fetch. */
export function useFetch<T = any>(
  url: string,
  options?: UseFetchOptions<T>,
): UseFetchReturn<T> {
  const [data, setData] = useState<T | null>(options?.initial ?? null);
  const [loading, setLoading] = useState(!options?.initial);
  const [error, setError] = useState<Error | null>(null);
  // Refs to track abort controller, latest options/url, and mount state across renders
  const abortControllerRef = useRef<AbortController | null>(null);
  const optionsRef = useRef(options);
  const urlRef = useRef(url);
  const mountedRef = useRef(true);

  optionsRef.current = options;
  urlRef.current = url;

  const refresh = useCallback(async (): Promise<T | null> => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithBody(urlRef.current, {
        ...optionsRef.current,
        signal: abortControllerRef.current.signal,
        objectBody: optionsRef.current?.body,
      });
      const data = (await response.json()) as T;
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
    if (!options?.initial) {
      refresh().catch(() => {});
    }
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { data, loading, error, refresh };
}
