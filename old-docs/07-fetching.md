# Fetching HTML

Client-side HTML fetching with automatic DOM insertion for Noxt projects.

## Introduction

The `useFetchHtml` hook provides a simple way to fetch HTML content from the server and optionally insert it into the DOM. It's designed for scenarios where you need to:

- Load HTML fragments dynamically
- Update parts of your page without full page reloads
- Integrate with server endpoints that return HTML
- Perform AJAX-style requests with automatic DOM updates

## Basic Usage

### Simple Fetch

```tsx
import { useFetchHtml } from "noxt/client";
import { html } from "htm/preact";

export function MyComponent() {
  const { fetch, loading, error, data } = useFetchHtml({
    action: "/api/content",
  });

  return html`
    <button onclick=${fetch} disabled=${loading}>
      ${loading ? "Loading..." : "Load Content"}
    </button>
    ${error && html`<div class="error">${error.message}</div>`}
    ${data && html`<div>${data}</div>`}
  `;
}
```

### With Automatic DOM Insertion

The hook can automatically insert fetched HTML into a target element:

```tsx
import { useFetchHtml } from "noxt/client";
import { html } from "htm/preact";

export function MyComponent() {
  const { fetch, loading, error } = useFetchHtml({
    action: "/api/content",
    target: "#content-target", // CSS selector
    swap: "innerHTML",
  });

  return html`
    <button onclick=${fetch} disabled=${loading}>Load</button>
    <div id="content-target"></div>
    ${error && html`<div class="error">${error.message}</div>`}
  `;
}
```

## Configuration Options

### `action` (required)

The URL to fetch HTML from. Can be an absolute path or relative path.

```tsx
useFetchHtml({
  action: "/api/content",
});

useFetchHtml({
  action: "https://api.example.com/html",
});
```

### `method`

HTTP method to use. Defaults to `"GET"`.

```tsx
useFetchHtml({
  action: "/api/save",
  method: "POST",
  data: { title: "Hello" },
});
```

Supported methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.

### `data`

Request data. For GET requests, data is serialized to query parameters. For other methods, it's sent as JSON in the request body.

```tsx
// GET request - becomes /api/content?title=Hello&count=5
useFetchHtml({
  action: "/api/content",
  method: "GET",
  data: { title: "Hello", count: 5 },
});

// POST request - sent as JSON body
useFetchHtml({
  action: "/api/save",
  method: "POST",
  data: { title: "Hello", content: "World" },
});
```

### `headers`

Custom request headers:

```tsx
useFetchHtml({
  action: "/api/content",
  headers: {
    Authorization: "Bearer token",
    "X-Custom-Header": "value",
  },
});
```

### `target`

Target element for automatic HTML insertion. Can be:

- A CSS selector string (e.g., `"#my-id"`, `".my-class"`)
- An `HTMLElement` reference
- `undefined`

```tsx
// Using selector
useFetchHtml({
  action: "/api/content",
  target: "#content",
});

// Using ref
import { useRef } from "preact/hooks";

function MyComponent() {
  const contentRef = useRef<HTMLDivElement>(null);

  const { fetch } = useFetchHtml({
    action: "/api/content",
    target: contentRef.current,
  });

  return html`<div ${contentRef}></div>`;
}
```

### `swap`

Strategy for inserting HTML into the target element. Defaults to `"innerHTML"`.

| Strategy      | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| `innerHTML`   | Replace the inner content of the target element                 |
| `outerHTML`   | Replace the entire target element                               |
| `beforebegin` | Insert immediately before the target element                    |
| `afterbegin`  | Insert inside the target element, before its first child        |
| `beforeend`   | Insert inside the target element, after its last child (append) |
| `afterend`    | Insert immediately after the target element                     |

```tsx
// Append content
useFetchHtml({
  action: "/api/more-content",
  target: "#list",
  swap: "beforeend",
});

// Prepend content
useFetchHtml({
  action: "/api/notification",
  target: "#notifications",
  swap: "afterbegin",
});

// Replace entire element
useFetchHtml({
  action: "/api/replace",
  target: "#old-content",
  swap: "outerHTML",
});
```

## Return Value

The hook returns an object with the following properties:

| Property  | Type                    | Description                                   |
| --------- | ----------------------- | --------------------------------------------- |
| `fetch`   | `() => Promise<string>` | Function to trigger the fetch manually        |
| `loading` | `boolean`               | Whether a fetch is currently in progress      |
| `error`   | `Error \| null`         | Any error that occurred during the last fetch |
| `data`    | `string \| null`        | The last successfully fetched HTML            |

## Examples

### Load-on-Click Component

```tsx
import { useFetchHtml } from "noxt/client";
import { html } from "htm/preact";

export function LoadMoreButton({ url }: { url: string }) {
  const { fetch, loading, error } = useFetchHtml({
    action: url,
    target: "#content-area",
    swap: "beforeend",
  });

  return html`
    <div>
      <button onclick=${fetch} disabled=${loading}>
        ${loading ? "Loading..." : "Load More"}
      </button>
      ${error && html`<p class="text-red-500">Error: ${error.message}</p>`}
    </div>
  `;
}
```

### Form Submission

```tsx
import { useFetchHtml } from "noxt/client";
import { useState } from "preact/hooks";
import { html } from "htm/preact";

export function SearchForm() {
  const [query, setQuery] = useState("");

  const { fetch, loading, error } = useFetchHtml({
    action: "/api/search",
    method: "GET",
    target: "#search-results",
    swap: "innerHTML",
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    // Update options dynamically
    fetch();
  };

  return html`
    <form onsubmit=${handleSubmit}>
      <input
        type="text"
        value=${query}
        oninput=${(e: Event) => setQuery((e.target as HTMLInputElement).value)}
        placeholder="Search..."
      />
      <button type="submit" disabled=${loading}>Search</button>
    </form>
    <div id="search-results"></div>
    ${error && html`<p>${error.message}</p>`}
  `;
}
```

### Dynamic Content Loading

```tsx
import { useFetchHtml } from "noxt/client";
import { useState } from "preact/hooks";
import { html } from "htm/preact";

type Tab = "home" | "profile" | "settings";

export function Tabs() {
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const { fetch, loading, error } = useFetchHtml({
    action: "/api/tab-content",
    method: "GET",
    data: { tab: activeTab },
    target: "#tab-content",
    swap: "innerHTML",
  });

  const loadTab = (tab: Tab) => {
    setActiveTab(tab);
    fetch();
  };

  return html`
    <div>
      <nav>
        <button
          onclick=${() => loadTab("home")}
          class=${activeTab === "home" ? "active" : ""}
        >
          Home
        </button>
        <button
          onclick=${() => loadTab("profile")}
          class=${activeTab === "profile" ? "active" : ""}
        >
          Profile
        </button>
        <button
          onclick=${() => loadTab("settings")}
          class=${activeTab === "settings" ? "active" : ""}
        >
          Settings
        </button>
      </nav>
      <div id="tab-content">${loading ? "Loading..." : "Select a tab"}</div>
      ${error && html`<p class="error">${error.message}</p>`}
    </div>
  `;
}
```

### Error Handling with Retry

```tsx
import { useFetchHtml, FetchError } from "noxt/client";
import { useState } from "preact/hooks";
import { html } from "htm/preact";

export function RetryableFetch() {
  const [retryCount, setRetryCount] = useState(0);

  const { fetch, loading, error } = useFetchHtml({
    action: "/api/data",
    target: "#data-container",
    swap: "innerHTML",
  });

  const handleFetch = async () => {
    try {
      await fetch();
      setRetryCount(0);
    } catch (err) {
      setRetryCount((n) => n + 1);
    }
  };

  return html`
    <div>
      <button onclick=${handleFetch} disabled=${loading}>
        ${loading
          ? "Loading..."
          : retryCount > 0
            ? `Retry (${retryCount})`
            : "Fetch"}
      </button>
      ${error &&
      html`
        <p class="error">
          Failed to load:
          ${error instanceof FetchError
            ? `HTTP ${error.status}`
            : error.message}
        </p>
      `}
      <div id="data-container"></div>
    </div>
  `;
}
```

### Manual Insertion (target: undefined)

When you want to handle HTML insertion manually:

```tsx
import { useFetchHtml } from "noxt/client";
import { useState } from "preact/hooks";
import { html } from "htm/preact";

export function CustomInsertion() {
  const [items, setItems] = useState<string[]>([]);

  const { fetch, data, loading } = useFetchHtml({
    // No target
    action: "/api/items",
  });

  const loadItems = async () => {
    const htmlContent = await fetch();
    // Manually handle the HTML
    setItems((prev) => [...prev, htmlContent]);
  };

  return html`
    <button onclick=${loadItems} disabled=${loading}>Load Items</button>
    <div>
      ${items.map(
        (item) => html`<div dangerouslySetInnerHTML=${{ __html: item }}></div>`,
      )}
    </div>
  `;
}
```

## Best Practices

1. **Use selectors wisely**: When using CSS selectors for `target`, ensure elements exist in the DOM when the hook is used.

2. **Error boundaries**: Always handle the `error` state to provide good user feedback.

3. **Cleanup**: The hook automatically cancels pending requests when a new one is triggered, preventing race conditions.

4. **Loading states**: Use the `loading` state to disable buttons or show spinners.

5. **Security**: Sanitize dynamic content on the server to prevent XSS attacks when inserting HTML.

6. **Performance**: Use `target: undefined` when you need to process the HTML before insertion.

## TypeScript Support

The hook is fully typed. Import types as needed:

```tsx
import {
  useFetchHtml,
  UseFetchHtmlOptions,
  UseFetchHtmlReturn,
  SwapStrategy,
  HttpMethod,
  FetchError,
} from "noxt/client";

function MyComponent() {
  const options: UseFetchHtmlOptions = {
    action: "/api/content",
    method: "GET" as HttpMethod,
    target: "#content",
    swap: "innerHTML" as SwapStrategy,
  };

  const result: UseFetchHtmlReturn = useFetchHtml(options);
  // ...
}
```

## Comparison with `fetch`

| Feature                 | `useFetchHtml`     | Native `fetch` |
| ----------------------- | ------------------ | -------------- |
| Automatic DOM insertion | ✅ Yes             | ❌ No          |
| Loading state tracking  | ✅ Yes             | ❌ Manual      |
| Error state tracking    | ✅ Yes             | ❌ Manual      |
| Request cancellation    | ✅ Yes             | ❌ Manual      |
| TypeScript support      | ✅ Yes             | ✅ Yes         |
| Data serialization      | ✅ Auto (GET/POST) | ❌ Manual      |
| Swap strategies         | ✅ Yes             | ❌ No          |
