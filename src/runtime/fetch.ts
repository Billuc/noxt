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

/** Represents a non-OK HTTP response (e.g. 4xx/5xx). */
export class FetchError extends Error {
  status: number;

  public constructor(status: number, message: string) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

/** Options to configure a useFetch request. */
export interface UseFetchOptions<T> {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  initial?: T;
}

/** Options to configure a fetchJson request. */
export interface FetchJsonOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  abortController?: AbortController;
}

/** Return type of the useFetch hook. */
export interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T | null>;
}

/** Return type of the fetchJson function. */
export type FetchJsonReturn<T> =
  | { data: T | null; error: null }
  | { data: null; error: Error };

export async function fetchJson<T>(
  url: string,
  options?: FetchJsonOptions,
): Promise<FetchJsonReturn<T>> {
  try {
    const {
      method = "GET",
      body,
      headers: customHeaders = {},
      abortController,
    } = options ?? {};

    const finalHeaders: Record<string, string> = { ...customHeaders };
    const finalUrl =
      url.startsWith("http://") || url.startsWith("https://")
        ? new URL(url)
        : new URL(url, window.location.origin);
    let finalBody: BodyInit | null | undefined = undefined;

    if (body != null) {
      if (method === "GET") {
        for (const [k, v] of Object.entries(body)) {
          finalUrl.searchParams.append(k, String(v));
        }
      } else {
        finalBody = JSON.stringify(body);
        finalHeaders["Content-Type"] = "application/json";
      }
    }

    const response = await fetch(finalUrl, {
      method,
      headers: finalHeaders,
      body: finalBody,
      signal: abortController?.signal,
    });

    if (!response.ok) {
      throw new FetchError(response.status, response.statusText);
    }

    const json: T = await response.json();
    return { data: json, error: null };
  } catch (err) {
    if (!(err instanceof Error)) {
      return { data: null, error: Error(String(err)) };
    }
    if (err.name === "AbortError") {
      return { data: null, error: null };
    }
    return { data: null, error: err };
  }
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
      const { data, error } = await fetchJson<T>(urlRef.current, {
        ...optionsRef.current,
        abortController: abortControllerRef.current,
      });
      if (!!error) {
        if (mountedRef.current) {
          setError(error);
        }
        throw error;
      }
      if (mountedRef.current && !!data) {
        setData(data);
      }
      return data;
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
