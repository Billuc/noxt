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
import { useState, useRef, useCallback } from "preact/hooks";

/**
 * Supported swap strategies for inserting HTML into the DOM.
 * Matches browser insertAdjacentHTML positions plus common replacements.
 */
export type SwapStrategy =
  | "innerHTML" // Replace the inner content of the target element
  | "outerHTML" // Replace the entire target element
  | "beforebegin" // Insert immediately before the target element
  | "afterbegin" // Insert inside the target element, before its first child
  | "beforeend" // Insert inside the target element, after its last child (append)
  | "afterend"; // Insert immediately after the target element

/**
 * Supported HTTP methods.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Form data serialization format.
 */
export type FormDataFormat = "auto" | "json" | "formdata" | "urlencoded";

export class FetchError extends Error {
  status: number;

  public constructor(status: number, message: string) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

/**
 * Options for the useFetchHtml hook.
 */
export interface UseFetchHtmlOptions {
  /** The URL to fetch HTML from */
  action: string;
  /** HTTP method to use */
  method?: HttpMethod;
  /** Request data. Sent as a JSON body or in the query for GET requests */
  data?: Record<string, any> | null;
  /** Request headers */
  headers?: HeadersInit;
  /** Target element (HTMLElement) or selector string (#id) for automatic HTML insertion */
  target?: HTMLElement | string;
  /** Strategy for inserting the fetched HTML (requires target) */
  swap?: SwapStrategy;
}

/**
 * Return value from the useFetchHtml hook.
 */
export interface UseFetchHtmlReturn {
  /** Function to manually trigger the fetch */
  fetch: () => Promise<string>;
  /** Whether a fetch is currently in progress */
  loading: boolean;
  /** Any error that occurred during the last fetch */
  error: Error | null;
  /** The last successfully fetched HTML */
  data: string | null;
}

/**
 * Perform DOM swap based on strategy.
 * @param target - The target element
 * @param html - The HTML to insert
 * @param strategy - The swap strategy
 */
function performSwap(
  target: HTMLElement,
  html: string,
  strategy: SwapStrategy,
): void {
  switch (strategy) {
    case "innerHTML":
      target.innerHTML = html;
      break;
    case "outerHTML":
      target.outerHTML = html;
      break;
    case "beforebegin":
    case "afterbegin":
    case "beforeend":
    case "afterend":
      target.insertAdjacentHTML(strategy, html);
      break;
    default:
      target.innerHTML = html;
  }
}

/**
 * Resolve target to HTMLElement.
 * If target is a string, it's treated as a CSS selector (usually an ID selector like "#my-id").
 * If target is already an HTMLElement, it's returned as-is.
 */
function resolveTarget(target: HTMLElement | string): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  if (typeof target === "string") {
    const el = document.querySelector<HTMLElement>(target);
    return el || null;
  }
  return null;
}

/**
 * Custom hook for fetching HTML content with optional automatic DOM insertion.
 *
 * @param options - Fetch configuration options including optional target for auto-insertion
 * @returns Object with fetch function and state
 *
 * @example
 * ```ts
 * // With automatic insertion into #content
 * const { fetch, loading, error } = useFetchHtml({
 *   action: '/api/content',
 *   target: '#content',
 *   swap: 'innerHTML',
 * });
 *
 * <button onclick=${fetch} ?disabled=${loading}>Load</button>
 * <div id="content"></div>
 *
 * // With element reference
 * const { fetch } = useFetchHtml({
 *   action: '/api/content',
 *   target: myRef.current,
 *   swap: 'beforeend',
 * });
 * ```
 */
export function useFetchHtml(options: UseFetchHtmlOptions): UseFetchHtmlReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const doFetch = useCallback(async (): Promise<string> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const {
        action,
        method = "GET",
        data,
        headers = {},
        target,
        swap = "innerHTML",
      } = options;

      const finalHeaders: HeadersInit = new Headers(headers);
      const finalUrl = new URL(action);
      let finalBody: BodyInit | null | undefined = null;

      if (!!data) {
        if (method === "GET") {
          Object.entries(data).forEach(([k, v]) => {
            finalUrl.searchParams.append(k, String(v));
          });
        } else {
          finalBody = JSON.stringify(data);
          finalHeaders.set("Content-Type", "application/json");
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

      const html = await response.text();
      setData(html);

      // Auto-insert if target is provided
      if (html && target !== undefined) {
        const targetElement = resolveTarget(target);
        if (targetElement) {
          performSwap(targetElement, html, swap);
        }
      }

      return html;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Request was cancelled, don't set error
        return "";
      }
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      throw errorObj;
    } finally {
      setLoading(false);
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, [options]);

  return { fetch: doFetch, loading, error, data };
}
