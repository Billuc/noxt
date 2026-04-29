# Server-Side Rendering (SSR)

Server-Side Rendering (SSR) is the process of rendering pages to HTML on the server in response to each request. Noxt provides a powerful SSR implementation built on Bun, enabling dynamic, data-driven applications with excellent SEO and performance characteristics.

## What is SSR?

SSR means:

1. **Each request** triggers a fresh render on the server
2. **HTML is generated** in response to the specific request (with request-specific data)
3. **Full page HTML** is sent to the client
4. **Islands hydrate** on the client for interactivity

## SSR vs. Prerendering vs. CSR

| Feature               | SSR                     | Prerendering      | CSR (Client-Side Rendering) |
| --------------------- | ----------------------- | ----------------- | --------------------------- |
| When it runs          | Request time            | Build time        | Client browser              |
| Output                | Dynamic HTML            | Static HTML       | Empty HTML + JS             |
| Server required       | ✅                      | ❌                | ✅ (for API)                |
| Data per request      | ✅                      | ❌                | ✅                          |
| SEO friendly          | ✅                      | ✅                | ⚠️ (needs work)             |
| Initial load speed    | ⚠️ (server must render) | ✅ (static files) | ⚠️ (blank HTML)             |
| Time to Interactive   | ⚠️                      | ⚠️                | ⚠️                          |
| Islands supported     | ✅                      | ✅                | N/A                         |
| User-specific content | ✅                      | ❌                | ✅                          |

## When to Use SSR

Use SSR when you need:

- **Per-request data**: User-specific content, authenticated pages, real-time data
- **Dynamic content**: Content that changes frequently or based on user input
- **SEO for dynamic pages**: Search engines need to index pages with request-specific data
- **Social sharing**: OpenGraph tags that depend on page content
- **Authentication**: Pages that require user login
- **API endpoints**: Server-side logic and data fetching

## How SSR Works in Noxt

### Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      SSR Request Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. REQUEST RECEIVED                                           │
│     ┌─────────────┐                                             │
│     │  Request     │  URL: /users/123                            │
│     │  /users/123  │  Method: GET                               │
│     └──────┬──────┘  Headers: Cookie, User-Agent, etc.          │
│            │                                                  │
│            ▼                                                  │
│  2. ROUTE RESOLUTION                                            │
│     ┌─────────────┐                                             │
│     │  Match route │  /users/[id].ts                            │
│     │  to file     │  → /users/123                             │
│     └──────┬──────┘                                             │
│            │                                                  │
│            ▼                                                  │
│  3. DATA FETCHING                                              │
│     ┌─────────────┐                                             │
│     │  Get request │  Context: { params: { id: 123 },         │
│     │   context    │            request, cookies, etc. }       │
│     └──────┬──────┘                                             │
│            │                                                  │
│            ▼                                                  │
│  4. PAGE RENDERING                                             │
│     ┌─────────────┐                                             │
│     │  Import page │  import UserPage from "../pages/users/[id]"│
│     │  component   │                                             │
│     └──────┬──────┘                                             │
│            │                                                  │
│            ▼                                                  │
│     ┌─────────────┐                                             │
│     │  Render to   │  <UserPage params={{ id: 123 }} context={ctx}/>│
│     │   HTML      │  → "<h1>User 123</h1>..."                  │
│     └──────┬──────┘                                             │
│            │                                                  │
│            ▼                                                  │
│  6. RESPONSE SENT                                              │
│     ┌─────────────┐                                             │
│     │  Full HTML   │  <!DOCTYPE html>                          │
│     │  response    │  <html><body>...islands...</body></html>   │
│     └─────────────┘  Status: 200                              │
│                        Content-Type: text/html                 │
│                                                                  │
│  7. CLIENT HYDRATION                                            │
│     Browser loads HTML immediately                              │
│     Island scripts load in parallel                             │
│     Islands hydrate independently                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The serverRender Function

At the core of Noxt's SSR is the `serverRender` function. This function:

- Passes props to the provided component
- Renders it to a string
- Creates a Response from that string with the correct headers

## Running the SSR Server

After building, start the server:

```bash
# Build for production
bun run noxt build

# Start the server
cd dist && bun run ./index.js
```

Or run development server:

```bash
bun run --hot ./index.ts
```

### Server Entry Point

Your `index.ts` file should start a Bun server:

```ts
// index.ts
import { serverRender, prepareImportMap } from "noxt";
import UserCard from "./src/components/UserCard";

const importMap = await prepareImportMap();

Bun.serve({
  port: 2101,
  routes: {
    ...importMap,
    // Our Server-Side route
    "/user/[id]": (req) => serverRender(UserCard, req),
  },
});
```

## Using Islands in SSR

Islands work automatically in SSR:

```tsx
// src/components/Dashboard.ts
import { html } from "htm/preact";
import Counter from "../islands/Counter";
import UserProfile from "../islands/UserProfile";

export default async function Dashboard({ request }) {
  const user = await getUserFromRequest(request);

  return html`
    <div>
      <h1>Welcome, ${user.name}!</h1>
      <p>This is server-rendered content.</p>

      <!-- Islands are automatically processed -->
      <${Counter} initialCount=${10} />
      <${UserProfile} userId=${user.id} />
    </div>
  `;
}
```

The build system automatically:

- Detects that `Counter` and `UserProfile` are from the islands directory
- Generates placeholder HTML with data attributes
- Creates client-side scripts for hydration
- Islands will hydrate on the client after page load

## Testing SSR

### Manual Testing

```bash
# Start development server
bun dev

# Test with curl
curl http://localhost:2101
curl http://localhost:2101/users/123
```

### Automated Testing

```ts
// tests/ssr.test.ts
import { describe, it, expect } from "bun:test";
import { serverRender } from "noxt";
import HomePage from "../src/pages/index";

describe("SSR", () => {
  it("renders home page", async () => {
    const response = await serverRender(HomePage, {});
    const html = await response.text();

    expect(html).toContain("<h1>Welcome</h1>");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html");
  });
});
```

Run tests:

```bash
bun test
```

## Best Practices

### 1. Use the Right Rendering Method

```
Scenario → Rendering Method
┌─────────────────────────────────────────────┐
│ Static content (blog, docs)       → Prerendering │
│ User-specific content (profile)    → SSR          │
│ API endpoints                     → SSR          │
│ Dashboard with real-time data     → SSR + Islands │
│ Marketing site                    → Prerendering │
│ E-commerce (product pages)       → Prerendering │
│ E-commerce (cart)                 → SSR          │
└─────────────────────────────────────────────┘
```

### 2. Use Islands for Interactivity

```tsx
// Good: Static page with interactive islands
export default async function Page() {
  return html`
    <div>
      <h1>Welcome</h1>
      <p>Static content...</p>
      <${Dashboard} /> {/* Only this part is interactive */}
    </div>
  `;
}
```

### 3. Handle Errors Gracefully

WIP

```tsx
async function Page({ params }) {
  try {
    const post = await getPost(params.id);
    if (!post) return new Response("Not found", { status: 404 });
    return html`<${Post} post=${post} />`;
  } catch (error) {
    console.error(error);
    return new Response("Server error", { status: 500 });
  }
}
```
