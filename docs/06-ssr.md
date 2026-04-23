# Server-Side Rendering (SSR)

Server-Side Rendering (SSR) is the process of rendering pages to HTML on the server in response to each request. Noxt provides a powerful SSR implementation built on Bun, enabling dynamic, data-driven applications with excellent SEO and performance characteristics.

## What is SSR?

SSR means:
1. **Each request** triggers a fresh render on the server
2. **HTML is generated** in response to the specific request (with request-specific data)
3. **Full page HTML** is sent to the client (no client-side framework required)
4. **Islands hydrate** on the client for interactivity

## SSR vs. Prerendering vs. CSR

| Feature | SSR | Prerendering | CSR (Client-Side Rendering) |
|---------|-----|--------------|----------------------------|
| When it runs | Request time | Build time | Client browser |
| Output | Dynamic HTML | Static HTML | Empty HTML + JS |
| Server required | ✅ | ❌ | ✅ (for API) |
| Data per request | ✅ | ❌ | ✅ |
| SEO friendly | ✅ | ✅ | ⚠️ (needs work) |
| Initial load speed | ⚠️ (server must render) | ✅ (static files) | ⚠️ (blank HTML) |
| Time to Interactive | ⚠️ | ⚠️ | ⚠️ |
| Islands supported | ✅ | ✅ | N/A |
| User-specific content | ✅ | ❌ | ✅ |

## When to Use SSR

Use SSR when you need:

- **Per-request data**: User-specific content, authenticated pages, real-time data
- **Dynamic content**: Content that changes frequently or based on user input
- **SEO for dynamic pages**: Search engines need to index pages with request-specific data
- **Social sharing**: OpenGraph tags that depend on page content
- **Authentication**: Pages that require user login
- **API endpoints**: Server-side logic and data fetching

### Common SSR Use Cases

| Use Case | Example | Why SSR? |
|----------|---------|---------|
| User Dashboard | Profile, settings, analytics | Needs authentication and user data |
| E-commerce Checkout | Cart, payment, receipt | User-specific, secure |
| Admin Panel | CMS, analytics dashboard | Authenticated, real-time data |
| Search Results | Product search | Dynamic based on query |
| API Endpoints | `/api/data` | Server-side logic |
| User-Generated Content | Forums, comments | Real-time updates |

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
│  5. ISLAND PROCESSING                                         │
│     ┌─────────────┐                                             │
│     │  For each    │  asIsland(Counter) →                       │
│     │  island      │  <div data-island="abc" data-props="{}"> │
│     │              │  <script src="/assets/abc.js"></script>   │
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

At the core of Noxt's SSR is the `serverRender` function from `src/server.ts`:

```ts
import { serverRender } from "noxt";

async function handleRequest(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  
  // 1. Import the page component based on the route
  const page = await importPage(pathname);
  
  // 2. Get route parameters from the pathname
  const params = extractParams(pathname);
  
  // 3. Create context object with request info
  const context = {
    request,
    params,
    cookies: request.cookies,
    headers: request.headers,
  };
  
  // 4. Render the page to HTML
  const response = await serverRender(page.default, {
    ...params,
    ...context,
  });
  
  return response;
}
```

The `serverRender` function:
```ts
export async function serverRender<Props>(
  page: ComponentType<Props>,
  props: Attributes & Props,
): Promise<Response> {
  const vnode = h(page, props, []);
  const body = await renderToStringAsync(vnode);
  const result = new Response(body, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
  return result;
}
```

## Building for SSR

### The Build Process

The `build()` function prepares Noxt for SSR deployment:

```ts
import { build, type BuildOptions } from "noxt";

await build({
  // Customize the build
  target: "bun",
  entrypoints: ["index.ts"],
  outdir: "dist",
  splitting: true,
  minify: true,
});
```

**What the build does:**

1. **Clears cache** - Removes `.cache/` directory
2. **Clears dist** - Removes previous build from `dist/`
3. **Prepares manifest** - Scans pages, prerenders for import map
4. **Creates import map plugin** - Generates dynamic imports for pages
5. **Runs Bun.build** - Bundles the application for Bun runtime

The import map plugin is key to SSR builds. It generates code like:

```ts
// Auto-generated by the import map plugin
import __page_index from ".cache/pages/index.html";
import __page_about from ".cache/pages/about.html";

export async function prepareImportMap() {
  return {
    "/": __page_index,
    "/about": __page_about,
  };
}
```

### Build Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entrypoints` | `string[]` | `[INDEX]` | Entry point files for Bun.build |
| `outdir` | `string` | `DIST` | Output directory |
| `target` | `"bun" \| ...` | `"bun"` | Build target (use "bun" for SSR) |
| `clearCache` | `boolean` | `true` | Clear cache before building |
| `clearDist` | `boolean` | `true` | Clear dist before building |
| `splitting` | `boolean` | `true` | Enable code splitting |
| `minify` | `boolean` | `true` | Minify output |

For SSR, you typically want:
- `target: "bun"` - Optimize for Bun runtime
- `splitting: true` - Code split for better caching
- `minify: true` - Reduce bundle size

## Running the SSR Server

After building, start the server:

```bash
# Build for production
bun run build

# Start the server (on port 2101 by default)
bun run dist/index.js
```

### Server Entry Point

The built server will handle requests:

```ts
// dist/index.js (after build)
import { serverRender } from "noxt";
import { prepareImportMap } from "lib/import_map";

const importMap = await prepareImportMap();

Bun.serve({
  port: process.env.PORT || 2101,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Route to page
    if (importMap[url.pathname]) {
      const page = importMap[url.pathname];
      return serverRender(page, { request: req });
    }
    
    // Handle assets
    // ...
    
    return new Response("Not found", { status: 404 });
  },
});
```

## Data Fetching

### Fetching in Page Components

```tsx
// pages/users/[id].tsx
import { html } from "htm/preact";
import { asIsland } from "noxt";

export default async function UserPage({ params, request }) {
  // Fetch user data from your API or database
  const user = await fetchUser(params.id);
  
  if (!user) {
    // Return 404 for missing users
    return new Response("User not found", {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }
  
  return html`
    <div>
      <h1>${user.name}</h1>
      <p>Email: ${user.email}</p>
      <p>Joined: ${new Date(user.createdAt).toLocaleDateString()}</p>
    </div>
  `;
}

async function fetchUser(id: string) {
  // Example: fetch from a database
  const db = new Database();
  return db.users.findOne({ id });
}
```

### Using Context

The page component receives a context object with request information:

```tsx
import { html } from "htm/preact";

export default async function Page({ request, cookies, headers, params }) {
  const userAgent = headers.get("user-agent");
  const session = cookies.get("session_id");
  const user = await getUserFromSession(session);
  
  return html`
    <div>
      <p>Browser: ${userAgent}</p>
      ${user ? html`<p>Welcome back, ${user.name}!</p>` : html`<a href="/login">Log in</a>`}
    </div>
  `;
}
```

### API Endpoints

Create API endpoints alongside your pages:

```tsx
// pages/api/users.ts
import { json } from "noxt/server";

export default async function handler(request: Request) {
  const { method } = request;
  
  if (method === "GET") {
    const users = await getUsers();
    return json(users);
  }
  
  if (method === "POST") {
    const body = await request.json();
    const user = await createUser(body);
    return json(user, { status: 201 });
  }
  
  return json({ error: "Method not allowed" }, { status: 405 });
}

function json(data: any, options?: { status?: number }) {
  return new Response(JSON.stringify(data), {
    status: options?.status || 200,
    headers: { "Content-Type": "application/json" },
  });
}
```

## Authentication

### Basic Authentication Pattern

```tsx
// pages/admin.ts
import { html } from "htm/preact";
import { redirect } from "noxt/server";

export default async function AdminPage({ request, cookies }) {
  const session = cookies.get("session_id");
  const user = await getUserFromSession(session);
  
  if (!user || !user.isAdmin) {
    // Redirect to login
    return redirect("/login?redirect=/admin");
  }
  
  return html`<AdminDashboard user=${user} />`;
}
```

### Session Management

```tsx
// utils/session.ts
import { cookies } from "noxt/server";

const SESSION_NAME = "session_id";
const SESSION_SECRET = process.env.SESSION_SECRET!;

export function getSession(request: Request): Session {
  const cookieStore = cookies(request);
  const sessionId = cookieStore.get(SESSION_NAME);
  
  if (!sessionId) {
    return { userId: null };
  }
  
  // Validate and decode session
  return validateSession(sessionId);
}

export function setSession(response: Response, userId: string): Response {
  const sessionId = createSession(userId);
  const cookie = `${SESSION_NAME}=${sessionId}; Path=/; HttpOnly; Secure`;
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/",
      "Set-Cookie": cookie,
    },
  });
}
```

## Error Handling

### Custom Error Pages

```tsx
// pages/_error.ts
import { html } from "htm/preact";

export default function ErrorPage({ status, message }) {
  return html`
    <div class="error-page">
      <h1>${status}</h1>
      <p>${message}</p>
      <a href="/">Go home</a>
    </div>
  `;
}
// This page will be shown for unhandled errors
```

### Throwing Errors

```tsx
// pages/users/[id].tsx
import { html } from "htm/preact";
import { notFound } from "noxt/server";

export default async function UserPage({ params }) {
  const user = await getUser(params.id);
  
  if (!user) {
    return notFound();
  }
  
  return html`<UserProfile user=${user} />`;
}
```

### Error Boundaries

Create reusable error handling:

```tsx
// components/ErrorBoundary.tsx
import { html } from "htm/preact";

export function ErrorBoundary({ children, fallback }) {
  // In SSR, errors are caught by the server
  // In islands, errors are caught by the island boundary
  return html`<${children} />`;
}

// Usage (this pattern works best with islands)
const SafeComponent = await asIsland(MyComponent);
html`<${SafeComponent} />`;
```

## Middleware

### Creating Middleware

Noxt supports middleware for cross-cutting concerns:

```tsx
// src/middleware/logger.ts
export function logger(request: Request, next: () => Promise<Response>) {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;
  
  console.log(`[${request.method}] ${request.url} - ${response.status} (${duration}ms)`);
  
  return response;
}

// src/middleware/auth.ts
export function auth(request: Request, next: () => Promise<Response>) {
  const session = getSession(request);
  
  if (!session.userId && !isPublicPath(request.url)) {
    return redirect("/login");
  }
  
  return next();
}
```

### Using Middleware

```ts
// In your server setup
import { build } from "noxt";
import { logger, auth } from "./middleware";

const server = Bun.serve({
  async fetch(request) {
    // Wrap with middleware
    return auth(request, () => {
      return logger(request, () => {
        return handleRequest(request);
      });
    });
  },
});
```

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
import HomePage from "../pages/index";

describe("SSR", () => {
  it("renders home page", async () => {
    const response = await serverRender(HomePage, {});
    const html = await response.text();
    
    expect(html).toContain("<h1>Welcome</h1>");
    expect(html).toContain("data-island");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html");
  });
  
  it("renders with props", async () => {
    const response = await serverRender(HomePage, { title: "Test" });
    const html = await response.text();
    
    expect(html).toContain("Test");
  });
});
```

Run tests:
```bash
bun test
```

## Deployment

### Docker

```dockerfile
# Dockerfile
FROM oven/bright:1.3.10

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

EXPOSE 2101

CMD ["bun", "run", "dist/index.js"]
```

Build and run:
```bash
docker build -t noxt-app .
docker run -p 2101:2101 noxt-app
```

### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Create and deploy
fly launch
fly deploy
```

### Cloudflare Workers

Noxt can run on Cloudflare Workers with some adaptation:

```ts
// worker.ts
import { serverRender } from "noxt";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle assets from KV
    // ...
    
    // Handle pages
    const page = await getPageFromKV(url.pathname, env);
    
    return serverRender(page, { request, env });
  },
};
```

## Performance Optimization

### Caching Responses

```ts
// src/middleware/cache.ts
import { crypto } from "node:crypto";

const cache = new Map();

export function cacheMiddleware(duration: number) {
  return async (request: Request, next: () => Promise<Response>) => {
    const key = generateCacheKey(request);
    
    if (cache.has(key)) {
      const { response, expires } = cache.get(key);
      if (expires > Date.now()) {
        return new Response(response.body, response);
      }
      cache.delete(key);
    }
    
    const response = await next();
    
    if (isCacheable(request, response)) {
      cache.set(key, {
        response: cloneResponse(response),
        expires: Date.now() + duration,
      });
    }
    
    return response;
  };
}

function generateCacheKey(request: Request): string {
  const hash = crypto.createHash("sha256");
  hash.update(request.method);
  hash.update(request.url);
  hash.update(request.headers.get("accept") || "");
  return hash.digest("hex");
}
```

### Connection Pooling

```ts
// src/db.ts
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}
```

### HTTP/2 Server Push

```ts
// In your server setup
Bun.serve({
  port: 2101,
  http2: true,
  fetch(request) {
    // Server push for assets
    // ...
  },
});
```

## Security

### Security Best Practices

1. **Validate all input** - User input, query parameters, cookies
2. **Sanitize output** - Prevent XSS attacks
3. **Use prepared statements** - Prevent SQL injection
4. **Set secure headers** - CSP, X-Frame-Options, etc.
5. **Rate limiting** - Prevent abuse
6. **HTTPS** - Always use secure connections

### Security Headers

```ts
// src/middleware/security.ts
export function securityHeaders(request: Request, next: () => Promise<Response>) {
  const response = await next();
  
  // Clone the response to modify headers
  const modified = new Response(response.body, response);
  
  // Set security headers
  modified.headers.set("X-Content-Type-Options", "nosniff");
  modified.headers.set("X-Frame-Options", "DENY");
  modified.headers.set("X-XSS-Protection", "1; mode=block");
  modified.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  modified.headers.set("Permission-Policy", "geolocation=(), microphone=(), camera=()");
  modified.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:"
  );
  modified.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  
  return modified;
}
```

### CSRF Protection

```ts
// src/middleware/csrf.ts
import { crypto } from "node:crypto";

const CSRF_TOKEN = "csrf_token";

export function csrfProtection(request: Request, next: () => Promise<Response>) {
  // Generate token for GET requests
  if (request.method === "GET") {
    const token = crypto.randomBytes(32).toString("base64");
    const response = await next();
    
    // Set token in cookie and header
    return addTokenToResponse(response, token);
  }
  
  // Validate token for state-changing requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const token = getTokenFromRequest(request);
    if (!isValidToken(token)) {
      return new Response("Invalid CSRF token", { status: 403 });
    }
  }
  
  return next();
}
```

## Debugging SSR

### Development Mode

```bash
# Run with enhanced logging
bun --log-level=debug dev
```

### Inspect Requests

```ts
// src/middleware/debug.ts
export function debugMiddleware(request: Request, next: () => Promise<Response>) {
  console.log("\n=== Request ===");
  console.log("Method:", request.method);
  console.log("URL:", request.url);
  console.log("Headers:", Object.fromEntries(request.headers.entries()));
  
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;
  
  console.log("Status:", response.status);
  console.log("Headers:", Object.fromEntries(response.headers.entries()));
  console.log("Duration:", duration, "ms");
  console.log("=== End Request ===\n");
  
  return response;
}
```

### Error Tracking

```ts
// src/middleware/error-tracker.ts
export function errorTracker(request: Request, next: () => Promise<Response>) {
  try {
    return await next();
  } catch (error) {
    console.error("Error:", error);
    
    // Send to error tracking service
    await trackError(error, request);
    
    // Return error response
    return new Response("Internal Server Error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
```

## Best Practices

### 1. Use the Right Rendering Method

```
scenario → rendering method
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

### 2. Minimize Per-Request Work

```tsx
// ✅ Good: Fetch once, reuse
async function Page() {
  const data = await cache.get("popular-posts");
  if (!data) {
    data = await fetchPopularPosts();
    await cache.set("popular-posts", data, 300); // 5 minutes
  }
  // ...
}

// ❌ Bad: Fetch on every request
async function Page() {
  const data = await fetchPopularPosts(); // No caching
  // ...
}
```

### 3. Use Islands for Interactivity

```tsx
// ✅ Good: Static page with interactive islands
export default async function Page() {
  const Dashboard = await asIsland(DashboardIsland);
  
  return html`
    <div>
      <h1>Welcome</h1>
      <p>Static content...</p>
      <${Dashboard} />  {/* Only this part is interactive */}
    </div>
  `;
}

// ❌ Bad: Entire page is client-side
// This defeats the purpose of SSR
```

### 4. Handle Errors Gracefully

```tsx
// ✅ Good: Error handling
async function Page({ params }) {
  try {
    const post = await getPost(params.id);
    if (!post) return notFound();
    return html`<Post post=${post} />`;
  } catch (error) {
    console.error(error);
    return serverError("Failed to load post");
  }
}
```

### 5. Use Streaming for Slow Pages

For pages with slow data fetching, consider streaming:

```tsx
import { html } from "htm/preact";
import { asIsland } from "noxt";

export default async function SlowPage() {
  const SlowComponent = await asIsland(SlowComponentIsland);
  
  return html`
    <div>
      <h1>Page Title</h1>
      <p>Fast loading content...</p>
      <${SlowComponent} />  {/* This island can load on client */}
    </div>
  `;
}
```

### 6. Optimize Database Queries

```tsx
// ✅ Good: Optimized queries
async function Page() {
  // Use select only needed fields
  const users = await db.users.findMany({
    select: { id: true, name: true, avatar: true },
    where: { active: true },
    limit: 10,
  });
  
  return html`<UserList users=${users} />`;
}

// ❌ Bad: Fetch everything
async function Page() {
  const users = await db.users.findMany(); // No filtering, no limit
  // ...
}
```
