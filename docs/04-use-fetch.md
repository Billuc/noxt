# useFetch Hook

`useFetch` is a Preact hook for client-side data fetching with loading/error states and automatic request cancellation.

## Basic Usage

```ts
import { useFetch } from "noxt/runtime";

function MyComponent() {
  const { data, loading, error, refresh } = useFetch<MyDataType>("/api/data");

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  return <p>{data}</p>;
}
```

## API

### `useFetch<T>(url, options?)`

```ts
function useFetch<T = any>(
  url: string,
  options?: UseFetchOptions<T>,
): UseFetchReturn<T>;
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `method` | `"GET"` \| `"POST"` \| `"PUT"` \| `"DELETE"` \| `"PATCH"` | `"GET"` | HTTP method |
| `body` | `any` | — | Request body. For GET requests, serialized as query params. For other methods, JSON-serialized with `Content-Type: application/json` |
| `headers` | `Record<string, string>` | `{}` | Custom HTTP headers |
| `initial` | `T` | — | Initial data value. When provided, skips the automatic fetch on mount |

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| null` | The fetched data, or `null` before the first fetch |
| `loading` | `boolean` | Whether a fetch is in progress |
| `error` | `Error \| null` | The last error, or `null` |
| `refresh` | `() => Promise<T \| null>` | Manually trigger a new fetch. Aborts any in-flight request |

## Behavior

### Auto-fetch on mount

The hook automatically calls `refresh()` on mount unless `initial` data is provided. When `initial` is set, `loading` starts as `false` and no fetch occurs.

### Request cancellation

Each call to `refresh()` aborts any previous in-flight request via `AbortController`. Requests are also aborted on component unmount to prevent state updates on unmounted components.

### URL handling

Relative URLs are resolved against `window.location.origin`. Absolute URLs (`http://` / `https://`) are used as-is.

### Error handling

- Non-OK HTTP responses throw a `FetchError` (includes the status code)
- `AbortError` is silently ignored (returns `null`)
- Non-Error thrown values are wrapped in `Error`

## Examples

### POST request

```ts
const { data, loading, error, refresh } = useFetch("/api/users", {
  method: "POST",
  body: { name: "Alice", role: "admin" },
});
```

### With initial data

```ts
const { data, loading, refresh } = useFetch("/api/users", {
  initial: [],
});
```

### Manual refresh

```ts
const { data, loading, refresh } = useFetch("/api/data");

return html`
  <button onClick=${refresh} disabled=${loading}>Refresh</button>
  ${loading ? html`<p>Loading...</p>` : html`<pre>${JSON.stringify(data)}</pre>`}
`;
```
