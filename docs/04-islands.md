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

### Step 1: Place the Component in the Islands Directory

Create your component in the `src/islands` directory (or your configured `islandsDir`):

```tsx
// src/islands/Counter.tsx
import { useState } from "preact/hooks";
import { html } from "htm/preact";

export default function Counter({
  initialCount = 0,
}: {
  initialCount?: number;
}) {
  const [count, setCount] = useState(initialCount);

  return html`
    <div class="counter">
      <button onClick=${() => setCount(count - 1)}>-</button>
      <span>${count}</span>
      <button onClick=${() => setCount(count + 1)}>+</button>
    </div>
  `;
}
```

**That's it!** Just export a regular Preact component.

### Step 2: Use the Island in a Page

Import and use the island component directly in your page:

```tsx
// src/pages/index.tsx
import { html } from "htm/preact";
import Counter from "../islands/Counter";

export default function HomePage() {
  return html`
    <div>
      <h1>Welcome to my site!</h1>
      <p>This content is server-rendered and static.</p>

      <!-- The island will automatically be hydrated on client-side -->
      <${Counter} initialCount=${10} />
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
     <script type="module" src=".cache/src/islands/abc123....js"></script>
   </div>
   ```

2. **User sees**: The page appears instantly with the counter displaying "10"

3. **Client hydrates**: The browser loads the island's JavaScript file and the counter becomes interactive

The build system automatically:

- Detects the components defined in the islands directory
- Generates a unique hash for each island based on its file path
- Creates a placeholder div with `data-island` and `data-props` attributes
- Generates a client-side script file for hydration
- Adds a `<script type="module">` tag to load the island's code

## Island Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Island Lifecycle                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. DETECTION          2. SCRIPT GENERATION    3. SERVER RENDER │
│  ─────────────         ────────────────────     ─────────────── │
│  Component in          prepareIslandScript()    HTML with        │
│  src/islands/         - Unique hash           data-island      │
│                        - Client script         data-props       │
│                        - Returns IslandData     script tag       │
│                                                             │
│  4. CLIENT LOAD          5. CLIENT HYDRATION                │
│  ─────────────         ────────────────                     │
│  HTML parsed           renderComponent()                    │
│  <script> loads        - Finds matching divs                 │
│  island JS fetches     - Parses props                        │
│                        - Mounts Preact component            │
│                        - Updates DOM (already has content)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Advanced Island Patterns

### Island with Children

```tsx
// src/islands/Card.tsx
import { html } from "htm/preact";

export default function Card({ title, children }) {
  return html`
    <div class="card">
      <h2>${title}</h2>
      <div class="content">${children}</div>
    </div>
  `;
}

// Usage in page:
// src/pages/index.tsx
import Card from "../islands/Card";

export default function HomePage() {
  return html`
    <div>
      <${Card} title="My Card">Some content</${Card}>
    </div>
  `;
}
```

### Island with Server Data

```tsx
// src/pages/blog/post.tsx
import { html } from "htm/preact";
import LikeButton from "../../islands/LikeButton";

export default async function BlogPost({ params }) {
  // Data has to be fetched on the server
  const post = await fetchPost(params.id);

  return html`
    <article>
      <h1>${post.title}</h1>
      <div>${post.content}</div>
      <!-- LikeButton is automatically detected as an island -->
      <${LikeButton} postId=${post.id} initialLikes=${post.likes} />
    </article>
  `;
}

// src/islands/LikeButton.tsx
import { useState } from "preact/hooks";
import { html } from "htm/preact";

export default function LikeButton({ postId, initialLikes }) {
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
```

### Conditional Islands

```tsx
// src/pages/user.tsx
export default function UserPage({ user }) {
  return html`
    <div>
      ${user?.isLoggedIn
        ? html`<${InteractiveDashboard} />`
        : html`<${StaticDashboard} />`}
    </div>
  `;
}
```

You can still use non-island components for fully static rendering. Just place them outside the islands directory.

## Configuration

Island directories are configured through `NoxtConfig`:

```ts
import { buildConfig } from "noxt";

const config = buildConfig({
  islandsDir: "src/islands", // Default
  // or
  islandsDir: "src/components/islands",
});
```

The build system will scan this directory for `.tsx`, `.ts`, `.jsx`, `.js` files and automatically process them as islands.

## Best Practices

### 1. Organize Islands by Feature

```
src/islands/
├── ui/
│   ├── Button.tsx
│   └── Modal.tsx
├── features/
│   ├── LikeButton.tsx
│   ├── CommentSection.tsx
│   └── ...
└── widgets/
    ├── Counter.tsx
    └── Timer.tsx
```

### 2. Keep Islands Focused

- Each island should have a single responsibility
- Don't create "wrapper" islands that contain multiple interactive elements
- Keep islands small and composable

### 3. Use Islands Sparingly

Only use islands for components that need interactivity:

```tsx
// ✅ Good: Only the button is an island
<div>
  <h1>Page Title</h1>
  <p>Static content...</p>
  <LikeButton />  {/* Only this is an island */}
</div>

// ❌ Bad: Entire section is an island
<InteractiveSection>  {/* This will hydrate everything */}
  <h1>Page Title</h1>
  <p>Static content...</p>
  <LikeButton />
</InteractiveSection>
```

### 4. Pass Minimal Props

Since props are serialized to JSON in the HTML, keep them small:

```tsx
// ✅ Good: Small props
<${UserCard} userId=${user.id} />

// ❌ Bad: Large props
<${UserCard} user=${user} />  // Entire user object
```

### 5. Use Primitive Types for Props

Props must be JSON-serializable. Stick to:

- Strings, numbers, booleans
- Arrays and objects (but keep them simple)
- null, undefined, null

Avoid:

- Functions (they can't be serialized)
- Dates (convert to string or ISO string)
- Class instances
- Circular references

### 6. Handle Loading States in Islands

```tsx
// src/islands/AsyncData.tsx
import { useState, useEffect } from "preact/hooks";
import { html } from "htm/preact";

export default function AsyncData({ url }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Alternatively, we could have used `useFetchHtml`

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return html`<div>Loading...</div>`;
  if (error) return html`<div>Error: ${error.message}</div>`;
  if (!data) return html`<div>No data</div>`;

  return html`<div>${JSON.stringify(data)}</div>`;
}

// In page:
// The initial HTML will show "Loading..." (from the rendered output)
// Then client-side fetch will update it with real data
<${AsyncData} url="/api/data" />
```

## Troubleshooting

### Islands Don't Hydrate

**Check:**

- Component is in the `islandsDir` directory (default: `src/islands`)
- Component has a default export
- Component is imported in a page
- No JavaScript errors in the console
- The `data-island` hash in HTML matches what's in the script filename

**Common causes:**

- Component file is not in the islands directory
- Missing default export
- Props that can't be serialized to JSON
- Component file has an extension not in `.tsx`, `.ts`, `.jsx`, `.js`

### Props Not Updating

Remember: props are serialized at build/render time. If you need dynamic props:

```tsx
// For static sites (prerender): Pass static props
<${Counter} initialCount=${5} />

// For SSR: Props can be dynamic per-request
<${Counter} initialCount=${requestSpecificValue} />

// For client-side updates: Use state in the island
<${Counter} />  // Counter manages its own state
```

### Script Files Not Loading / Island Not Interactive

**Check:**

- The script tag's `src` attribute is correct
- The script file exists in the output directory
- The file extension is correct
- No 404 errors for the script file
