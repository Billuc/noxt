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

