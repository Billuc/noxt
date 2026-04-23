# Islands

Islands are Noxt's core architecture for building interactive user interfaces. They allow you to create components that are rendered on the server but hydrate on the client, providing interactivity where needed while keeping the rest of your page as static HTML.

## What are Islands?

An **island** is an interactive component that:

1. **Server-rendered**: Renders to static HTML on the server
2. **Client-hydrated**: Loads JavaScript on the client to become interactive
3. **Isolated**: Each island is independent - hydrates only when its JavaScript loads
4. **Props-preserved**: Initial props are serialized to HTML, maintaining state

## Why Islands?

Traditional SPAs (Single Page Applications) have a fundamental problem: they ship and hydrate the entire application on the client, even for simple static pages. This leads to:

- Large client-side bundles
- Slow time-to-interactive
- Unnecessary JavaScript execution
- Poor performance on low-end devices

Islands solve this by **only hydrating what's interactive**:

```
Traditional SPA:      Noxt with Islands:
┌─────────────┐      ┌─────────────────────┐
│  Full App    │      │  Static HTML        │
│  JS Bundle   │      │  + Island 1 JS      │
│  ~100KB+    │  vs  │  + Island 2 JS      │
└─────────────┘      │  ~1-5KB each        │
                     └─────────────────────┘
```

## Creating an Island

### Step 1: Define the Component

Use `defineIsland()` to mark a component as an island:

```tsx
// components/Counter.tsx
import { useState } from "preact/hooks";
import { html } from "htm/preact";
import { defineIsland } from "noxt";

function Counter({ initialCount = 0 }: { initialCount?: number }) {
  const [count, setCount] = useState(initialCount);

  return html`
    <div class="counter">
      <button onClick=${() => setCount(count - 1)}>-</button>
      <span>${count}</span>
      <button onClick=${() => setCount(count + 1)}>+</button>
    </div>
  `;
}

// This is required to make it an island
export default defineIsland(Counter, import.meta.path);
```

**Important**: The second argument to `defineIsland()` must be `import.meta.path` - this tells Noxt where to find the component for client-side hydration.

### Step 2: Use the Island in a Page

In your page component, use `asIsland()` to transform the island for server-side rendering:

```tsx
// pages/index.tsx
import { html } from "htm/preact";
import { asIsland } from "noxt";
import Counter from "../components/Counter";

// Transform the island component
const InteractiveCounter = await asIsland(Counter);

export default async function HomePage() {
  return html`
    <div>
      <h1>Welcome to my site!</h1>
      <p>This content is server-rendered and static.</p>

      <!-- The island will render as static HTML first, 
           then hydrate on the client -->
      <${InteractiveCounter} initialCount=${10} />
    </div>
  `;
}
```

### Step 3: Understanding What Happens

When a user visits this page:

1. **Server renders**: The page renders to HTML including the counter's initial state

   ```html
   <div>
     <h1>Welcome to my site!</h1>
     <p>This content is server-rendered and static.</p>
     <div data-island="abc123..." data-props='{"initialCount":10}'></div>
     <script type="module" src=".cache/assets/abc123....js"></script>
   </div>
   ```

2. **User sees**: The page appears instantly with nothing displayed

3. **Client hydrates**: The browser loads the island's JavaScript file and the counter becomes interactive

## Island Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Island Lifecycle                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. DEFINITION         2. TRANSFORMATION    3. SERVER RENDER │
│  ─────────────         ────────────────     ─────────────── │
│  defineIsland()        asIsland()            HTML output     │
│  - Attaches path       - Generates hash      - Static markup  │
│  - Marks component     - Creates script      - data-island   │
│                         - Returns wrapper     - data-props    │
│                                              - script tag    │
│                                                             │
│  4. CLIENT LOAD          5. CLIENT HYDRATION                │
│  ─────────────         ────────────────                     │
│  HTML parsed           renderComponent()                    │
│  <script> loads        - Finds matching divs                 │
│  island JS fetches     - Parses props                        │
│                        - Mounts Preact component            │
│                        - Updates DOM                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Advanced Island Patterns

### Island with Children

```tsx
import { defineIsland } from "noxt";
import { html } from "htm/preact";

function Card({ title, children }) {
  return html`
    <div class="card">
      <h2>${title}</h2>
      <div class="content">${children}</div>
    </div>
  `;
}

export default defineIsland(Card, import.meta.path);

// Usage:
const InteractiveCard = await asIsland(Card);
html`<${InteractiveCard} title="My Card">Some content</${InteractiveCard}>`;
```

### Island with Server Data

```tsx
// pages/blog/post.tsx
import { html } from "htm/preact";
import { asIsland } from "noxt";
import LikeButton from "../components/LikeButton";

// Fetch data on server
export default async function BlogPost({ params }) {
  const post = await fetchPost(params.id);

  const LikeIsland = await asIsland(LikeButton);

  return html`
    <article>
      <h1>${post.title}</h1>
      <div>${post.content}</div>
      <${LikeIsland} postId=${post.id} initialLikes=${post.likes} />
    </article>
  `;
}

// components/LikeButton.tsx
import { useState } from "preact/hooks";
import { defineIsland } from "noxt";

function LikeButton({ postId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);
  const [loading, setLoading] = useState(false);

  async function handleLike() {
    setLoading(true);
    const response = await fetch(`/api/like/${postId}`, { method: "POST" });
    const newLikes = await response.json();
    setLikes(newLikes);
    setLoading(false);
  }

  return html`
    <button onClick=${handleLike} disabled=${loading}>${likes} likes</button>
  `;
}

export default defineIsland(LikeButton, import.meta.path);
```

### Conditional Islands

```tsx
export default async function Page({ user }) {
  const InteractiveComponent = await asIsland(MyComponent);
  const StaticComponent = MyComponent; // Use without asIsland for static rendering

  return html`
    <div>
      ${user?.isLoggedIn
        ? html`<${InteractiveComponent} />`
        : html`<${StaticComponent} />`}
    </div>
  `;
}
```

## Built-in Island: ServerComponent

Noxt provides a built-in `ServerComponent` island for server-side data fetching with client-side updates:

```tsx
import { ServerComponent } from "noxt";

// This component fetches data on the client
<ServerComponent
  action="/api/data"
  method="GET"
  loading={() => html`<div>Loading...</div>`}
/>;
```

**Props:**

- `action` (required): URL to fetch
- `method`: HTTP method (default: "GET")
- `body`: Request body
- `headers`: Request headers
- `loading`: Component to show while fetching
- `counter`: Internal counter for re-fetching

**How it works:**

1. Renders the `loading` component initially
2. Fetches data from the specified URL on the client
3. Replaces the loading component with the response HTML
4. Can be triggered to re-fetch by changing the `counter` prop

## Island Performance Tips

### 1. Keep Islands Small

Each island should be a focused, single-purpose component. Avoid creating large islands with many dependencies.

```tsx
// ✅ Good: Small, focused island
function LikeButton() { ... }

// ❌ Bad: Large island with many responsibilities
// Prefer SSR in this case
function EntirePost() {
  // Includes comments, like button, share, etc.
  ...
}
```

### 2. Lazy Load Heavy Islands

Use dynamic imports for islands with large dependencies:

```tsx
// components/HeavyChart.tsx
const HeavyChart = await import("../components/Chart");
const InteractiveChart = await asIsland(HeavyChart.default);
```

### 3. Minimize Props

Only pass necessary props to islands. Large props increase the `data-props` attribute size.

```tsx
// ✅ Good: Only pass what's needed
<${InteractiveComponent} userId=${user.id} />

// ❌ Bad: Passing entire objects
<${InteractiveComponent} user=${user} />  // user has many properties
```

### 4. Use Static Content for Non-Interactive Parts

```tsx
// ✅ Good: Only the form is an island
function Page() {
  const FormIsland = await asIsland(Form);

  return html`
    <div>
      <h1>Contact Us</h1>
      <p>Fill out the form below...</p>
      <!-- Only the form needs interactivity -->
      <${FormIsland} />
    </div>
  `;
}
```

## Debugging Islands

### Check Island Hash

Each island gets a unique hash based on its file path. You can see this in the `data-island` attribute in the rendered HTML:

```html
<div data-island="abc123..." data-props='{"count":5}'></div>
<script type="module" src=".cache/assets/abc123...js"></script>
```

The hash is a SHA-256 of the component's file path, encoded in base64url format.

### Verify Script Loading

Check that the `<script type="module">` tag for your island loads successfully in the browser's Network tab. The script should:

- Have a 200 status
- Contain the island's code
- Execute without errors

### Check Console Errors

If hydration fails, check for errors in the browser console. Common issues:

- Incorrect `import.meta.path` in `defineIsland()`
- Missing component default export
- Props that can't be serialized to JSON
- Network errors loading the script

### Props Serialization

Island props must be JSON-serializable. This means:

- ✅ Primitives (string, number, boolean, null)
- ✅ Arrays and plain objects
- ❌ Functions
- ❌ Classes
- ❌ Circular references
- ❌ React elements / VNodes
- ❌ Dates (use ISO strings or numerical timestamps instead)
- ❌ undefined (use null instead)

Example of problematic props:

```tsx
// ❌ Bad: Function prop
<${InteractiveComponent} onClick=${() => alert("hi")} />

// ❌ Bad: Date prop
<${InteractiveComponent} date=${new Date()} />

// ✅ Good: Serialized date
<${InteractiveComponent} date=${new Date().toISOString()} />
```

## Islands vs. Regular Components

| Feature              | Island Component | Regular Component |
| -------------------- | ---------------- | ----------------- |
| Server-rendered      | ✅               | ✅                |
| Client-hydrated      | ✅               | ❌                |
| Interactive          | ✅               | ❌                |
| JavaScript bundle    | ✅               | ❌                |
| Props serialization  | Required         | Not applicable    |
| Use `defineIsland()` | Required         | ❌                |
| Use `asIsland()`     | Required         | ❌                |
| `import.meta.path`   | Required         | ❌                |

Use **islands** for interactive elements and **regular components** for static content that doesn't need client-side interactivity.

## Best Practices Summary

1. **Start with regular components** - Only make components islands if they need interactivity
2. **Keep islands small** - Each island should have a single responsibility
3. **Minimize props** - Only pass what's necessary
4. **Use async page components** - Pages that use `asIsland()` must be async
5. **Test without JavaScript** - Your site should work (at least partially) with JS disabled
6. **Preload critical islands** - Use `<link rel="modulepreload">` for above-the-fold islands
7. **Lazy load non-critical islands** - Reduce initial bundle size
