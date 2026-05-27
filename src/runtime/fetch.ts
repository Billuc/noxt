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

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export class FetchError extends Error {
  status: number;

  public constructor(status: number, message: string) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

export interface UseFetchOptions<T> {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  initial?: T;
}

export interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T | null>;
}

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
      const { method = "GET", body, headers: customHeaders = {} } =
        optionsRef.current ?? {};

      const finalHeaders: Record<string, string> = { ...customHeaders };
      const finalUrl = urlRef.current.startsWith("http://") || urlRef.current.startsWith("https://")
        ? new URL(urlRef.current)
        : new URL(urlRef.current, window.location.origin);
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
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new FetchError(response.status, response.statusText);
      }

      const json: T = await response.json();
      if (mountedRef.current) {
        setData(json);
      }
      return json;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return null;
      }
      const errorObj = err instanceof Error ? err : new Error(String(err));
      if (mountedRef.current) {
        setError(errorObj);
      }
      throw errorObj;
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
