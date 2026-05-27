# API Reference

## Functions

### `defineIsland(component, importPath)`

Tags a Preact component as an island by storing its module path. Must be used with a default export.

```ts
function defineIsland<T>(
  component: FunctionComponent<T>,
  importPath: string,
): IslandComponent<T>
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `component` | `FunctionComponent<T>` | A Preact component |
| `importPath` | `string` | The module path (pass `import.meta.path`) |

**Returns:** An `IslandComponent<T>` — the same component with the import path attached via a `Symbol` key.

---

### `prepareIsland(island)`

Build-time function that generates a hydration script and returns a placeholder component.

```ts
function prepareIsland<T>(
  island: IslandComponent<T>,
): Promise<FunctionalComponent<T>>
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `island` | `IslandComponent<T>` | An island created with `defineIsland()` |

**Returns:** A Preact component that renders a `<div data-island="..." data-props="...">` placeholder and a `<script>` tag for the hydration script.

---

### `prepareRoutes()`

Build-time Bun macro that scans the `pages/` directory, prerenders every page, and generates a route map.

```ts
function prepareRoutes(): Promise<string>
```

**Returns:** The path to the generated `.cache/routes.js` file.

The returned file is a JavaScript module exporting a `Record<string, string>` mapping route names to prerendered HTML file paths.

---

### `useFetch(url, options?)`

Preact hook for client-side data fetching with loading/error states and automatic request cancellation.

```ts
function useFetch<T = any>(
  url: string,
  options?: UseFetchOptions<T>,
): UseFetchReturn<T>
```

See [useFetch Hook](04-use-fetch.md) for full documentation.

---

### `renderComponent(Component, hash)`

Client-side runtime function that hydrates all island placeholders matching a given hash.

```ts
function renderComponent(
  Component: ComponentType<any>,
  hash: string,
): void
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `Component` | `ComponentType<any>` | The Preact component to render |
| `hash` | `string` | The SHA-256 hash matching `data-island` attributes |

**Behavior:** Finds every DOM element with `[data-island="<hash>"]`, reads and JSON-parses `data-props`, and renders the component into each element.

---

## Types

### `IslandComponent<T>`

A Preact component branded with its island import path.

```ts
type IslandComponent<T> = FunctionComponent<T> & {
  [IMPORT_PATH]: string
}
```

---

### `UseFetchOptions<T>`

Options for the `useFetch` hook.

```ts
interface UseFetchOptions<T> {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  initial?: T;
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `method` | `HttpMethod` | `"GET"` | HTTP method |
| `body` | `any` | — | Request body. GET requests serialize as query params; other methods send JSON |
| `headers` | `Record<string, string>` | `{}` | Custom HTTP headers |
| `initial` | `T` | — | Initial data value. Skips auto-fetch on mount |

---

### `UseFetchReturn<T>`

Return value of the `useFetch` hook.

```ts
interface UseFetchReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<T | null>;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| null` | The fetched data, or `null` before the first fetch |
| `loading` | `boolean` | Whether a fetch is in progress |
| `error` | `Error \| null` | The last error, or `null` |
| `refresh` | `() => Promise<T \| null>` | Manually trigger a new fetch. Aborts any in-flight request |

---

### `FetchError`

Error class thrown on non-OK HTTP responses.

```ts
class FetchError extends Error {
  status: number;
  constructor(status: number, message: string);
}
```

---

### `MarkdownData`

Represents parsed markdown with frontmatter.

```ts
interface MarkdownData {
  frontmatter: Record<string, any>;
  content: string;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `frontmatter` | `Record<string, any>` | Parsed YAML frontmatter key-value pairs |
| `content` | `string` | The markdown body text (without frontmatter) |

---

## Build-Time Utilities

These functions are used internally by `prepareRoutes()` and `prepareIsland()` but are available for advanced use.

### `getRouteName(pathFromPages)`

Converts a file path relative to `pages/` into a URL route string.

```ts
function getRouteName(pathFromPages: string): string
```

See [Pages & Routing](02-pages-and-routing.md#route-name-resolution) for the route mapping table.

### `parseMarkdown(markdown)`

Extracts YAML frontmatter and body from a markdown string.

```ts
function parseMarkdown(markdown: string): MarkdownData
```

### `renderPageToHtml(component)`

Renders a Preact component to a complete HTML string.

```ts
function renderPageToHtml(
  component: preact.ComponentType,
): Promise<string>
```

### `renderMarkdownToHtml(markdownData, Layout)`

Renders parsed markdown data within a layout component to a complete HTML string.

```ts
function renderMarkdownToHtml(
  markdownData: MarkdownData,
  Layout: ComponentType<Record<string, any>>,
): Promise<string>
```
