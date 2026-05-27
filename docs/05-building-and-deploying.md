# Building & Deploying

Noxt uses Bun's native toolchain for building and running. There are no framework-specific CLI commands — everything uses standard Bun commands.

## Development

Start the development server:

```bash
bun run index.ts
```

The server prerenders pages at startup and serves them via `Bun.serve()`. It listens on the port configured in your entry point (default `3000` in the examples).

## Production Build

Bundle the project for production:

```bash
bun build --target=bun --outdir=dist index.ts
```

- `--target=bun` — targets the Bun runtime (not a browser)
- `--outdir=dist` — outputs to the `dist/` directory
- `index.ts` — your server entry point

The build produces `dist/index.js` along with a `.cache/` directory inside `dist/` containing the prerendered HTML files and hydration scripts.

## Preview the Built App

```bash
cd dist && bun run index.js
```

This runs the bundled server, serving the prerendered pages.

## Testing

```bash
bun test
```

Runs the test suite with Bun's built-in test runner.

## Cleaning Artifacts

```bash
rm -rf .cache dist
```

Removes cached prerendered files and build output.

## Deploying

Since Noxt produces a standard Bun server, you can deploy it anywhere Bun is supported:

1. Build the project: `bun build --target=bun --outdir=dist index.ts`
2. Copy the `dist/` directory to your server
3. Run `bun run index.js` on the server


### Example Dockerfile

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install
COPY . .
RUN bun build --target=bun --outdir=dist index.ts
WORKDIR /app/dist
EXPOSE 3000
CMD ["bun", "run", "index.js"]
```

## Project Entry Point

Your `index.ts` configures the server port and routes:

```ts
import { prepareRoutes } from "noxt" with { type: "macro" };

const routes = (await import(prepareRoutes())).default;

Bun.serve({
  port: 3000,
  routes,
});
```

Change the `port` value to match your deployment environment.
