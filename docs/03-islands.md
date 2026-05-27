# Islands

Islands are interactive Preact components that are **prerendered on the server** but also shipped as client-side JavaScript for hydration. Only the island code is sent to the client — the rest of the page remains static HTML. This is the core of Noxt's small-bundle approach.

## Defining an Island

Use `defineIsland()` to tag a Preact component with its module path:

`islands/counter.tsx`:

```ts
import { useState } from "preact/hooks";
import { html } from "htm/preact";
import { defineIsland } from "noxt";

function Counter() {
  const [count, setCount] = useState(0);
  return html`<button onClick=${() => setCount((c) => c + 1)}>
    ${count}
  </button>`;
}

export default defineIsland(Counter, import.meta.path);
```

- `defineIsland(component, importPath)` stores the module path on the component via a `Symbol` key
- `import.meta.path` tells the build system where to find the component for client-side bundling
- The island component must be **exported as the default export** of its module (`export default defineIsland(...)`)

## Using an Island in a Page

Islands cannot be imported directly in a page. They must be prepared first with `prepareIsland()`:

`pages/counter-demo.ts`:

```ts
import { html } from "htm/preact";
import Counter from "../islands/counter";
import { prepareIsland } from "noxt";

const CounterIsland = await prepareIsland(Counter);

export default function CounterPage() {
  return html`<${CounterIsland} />`;
}
```

`prepareIsland()` is a build-time function that:

1. Computes a SHA-256 hash of the island's import path
2. Generates a hydration script that imports the island module and renders it client-side
3. Writes the script to `.cache/<hash>.js`
4. Returns a new Preact component that renders a placeholder `<div>` with `data-island` and `data-props` attributes, followed by a `<script>` tag loading the hydration script

The emitted HTML looks like:

```html
<div data-island="abc123..." data-props="{&quot;prop1&quot;:&quot;val1&quot;}"></div>
<script src=".cache/abc123....js"></script>
```

## Client-Side Hydration

When the browser loads the page:

1. The `<script src=".cache/<hash>.js">` loads and executes
2. It imports `renderComponent()` from Noxt's runtime and the island component
3. `renderComponent(Island, hash)` finds all DOM elements with `[data-island="<hash>"]`
4. For each element, it reads `data-props`, parses it as JSON, and renders the Preact component **into** that element

This means multiple instances of the same island with different props are supported on a single page.

## Passing Props

Props are serialized to JSON in the `data-props` attribute:

```ts
const CounterIsland = await prepareIsland(Counter);

export default function Page() {
  return html`
    <${CounterIsland} initialValue=${5} />
    <${CounterIsland} initialValue=${10} />
  `;
}
```

Each instance hydrates independently with its own props.

## Notes

- Islands use `htm/preact`'s `render()` for client-side hydration, which replaces the placeholder element's content with the live component
- The island's source module is imported directly in the generated script, so Bun's bundler knows to include it in the client bundle
- Only islands need client-side JavaScript — the rest of the page is pure HTML
