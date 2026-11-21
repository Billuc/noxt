import { readFile, Path } from "./fs";
import type {
  NoxtServer,
  RouteHandler,
  RouteHandlers,
  ServerImplementation,
} from "./types";
import { stat, watch } from "node:fs/promises";
import { debounce } from "./utils";
import type { FileChangeInfo } from "node:fs/promises";
import { lookup } from "mrmime";

class AbortError extends Error {}

export const HMR_ENDPOINT = "/__noxt_hmr";

const HMR_CLIENT_SCRIPT =
  '<script>new EventSource("' +
  HMR_ENDPOINT +
  '").onmessage=()=>location.reload()</script>';

function injectHmrClient(html: string): string {
  if (html.includes(HMR_CLIENT_SCRIPT)) return html;

  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, HMR_CLIENT_SCRIPT + "</body>");
  }
  return html;
}

function wrapHtmlHandler(handler: RouteHandler): RouteHandler {
  return async (request: Request) => {
    const response = await handler(request);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return response;
    }

    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(injectHmrClient(html), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

export class HmrManager {
  private clients = new Set<ReadableStreamDefaultController<Uint8Array>>();
  private encoder = new TextEncoder();

  private createEventStream(): ReadableStream<Uint8Array> {
    let client: ReadableStreamDefaultController<Uint8Array> | undefined;

    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        client = controller;
        this.clients.add(controller);
        controller.enqueue(this.encoder.encode(": connected\n\n"));
      },
      cancel: () => {
        if (client) this.clients.delete(client);
      },
    });
  }

  public wrapRoutes(routes: RouteHandlers<any>): RouteHandlers<any> {
    const wrapped: RouteHandlers<any> = {};

    for (const [route, methods] of Object.entries(routes)) {
      const wrappedMethods: Record<string, RouteHandler> = {};
      for (const [method, handler] of Object.entries(methods)) {
        wrappedMethods[method] =
          method === "GET" ? wrapHtmlHandler(handler) : handler;
      }
      wrapped[route] = wrappedMethods;
    }

    wrapped[HMR_ENDPOINT] = {
      GET: () =>
        new Response(this.createEventStream(), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        }),
    };

    return wrapped;
  }

  public broadcastReload(): void {
    const payload = this.encoder.encode("data: reload\n\n");
    for (const controller of this.clients) {
      try {
        controller.enqueue(payload);
      } catch {
        this.clients.delete(controller);
      }
    }
  }
}

/** Imports an optional generated module. Returns null only when the file does not exist. */
async function tryImport<T extends any = any>(
  filepath: Path,
  isDev: boolean,
): Promise<T | null> {
  try {
    await stat(filepath.absolute);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }

  let importPath = filepath.absolute;
  if (isDev) {
    importPath += "?t=" + performance.now();
  }
  try {
    return (await import(importPath)) as T;
  } catch (error) {
    const contextualError = new Error(
      `Failed to load generated routes from "${filepath.absolute}". Check the source files it was generated from.`,
      { cause: error },
    );
    console.error(contextualError);
    throw contextualError;
  }
}

async function importRoutes(isDev: boolean): Promise<RouteHandlers<any>> {
  let handlers: RouteHandlers<any> = {};

  const apis = await tryImport(Path.fromCwd(".cache/api.ts"), isDev);
  if (apis) {
    handlers = { ...handlers, ...apis.handlers };
  }

  const ssr = await tryImport(Path.fromCwd(".cache/ssr.ts"), isDev);
  if (ssr) {
    handlers = { ...handlers, ...ssr.handlers };
  }

  const routesFile = Path.fromCwd(".cache/routes.json").absolute;
  const routesStr = await readFile(routesFile);
  const routesJson = JSON.parse(routesStr) as Record<string, string>;

  for (const [url, file] of Object.entries(routesJson)) {
    handlers[url] = {
      GET: async () => {
        const content = await readFile(file);
        return new Response(content, {
          headers: {
            "Content-Type": lookup(file) || "application/octet-stream",
          },
        });
      },
    };
  }

  return handlers;
}

export class NoxtDevServer implements NoxtServer {
  private abortController: AbortController;
  private server: ServerImplementation | undefined;
  private hmr = new HmrManager();

  constructor(
    private buildCommand: string[],
    private createServer: (data: {
      routes: RouteHandlers<any>;
    }) => Promise<ServerImplementation>,
  ) {
    this.abortController = new AbortController();
    this.server = undefined;
  }

  private async restartServer() {
    if (!this.server) {
      throw new Error(
        "Could not reload the server since it hasn't been started !",
      );
    }

    const routes = this.hmr.wrapRoutes(await importRoutes(true));
    this.server = await this.server.reload({ routes });
    this.hmr.broadcastReload();
  }

  private async buildProject(): Promise<void> {
    this.abortController.abort();
    this.abortController = new AbortController();

    console.log("Building...");
    const buildStep = Bun.spawn({
      cmd: this.buildCommand,
      stderr: "inherit",
      stdout: "inherit",
      signal: this.abortController.signal,
    });
    const buildCode = await buildStep.exited;

    if (buildStep.signalCode === "SIGTERM") {
      throw new AbortError("Aborted !");
    }
    if (buildCode !== 0) {
      throw new Error("Build failed !");
    }
  }

  private async onFileChange(fc: FileChangeInfo<string>) {
    console.log(
      fc.filename +
        " changed ! Rebuilding the project and restarting the server...",
    );
    try {
      await this.buildProject();
    } catch (err) {
      if (!(err instanceof AbortError)) throw err;
      return;
    }
    await this.restartServer();
  }

  private async startServer() {
    await this.buildProject();
    const routes = this.hmr.wrapRoutes(await importRoutes(true));
    this.server = await this.createServer({ routes });

    const watcher = watch("src", {
      recursive: true,
    });
    const onEvent = debounce(this.onFileChange.bind(this), 200);

    for await (const ev of watcher) {
      onEvent(ev);
    }
  }

  public async start() {
    await this.startServer();
  }
}

export class NoxtProdServer implements NoxtServer {
  constructor(
    private createServer: (data: {
      routes: RouteHandlers<any>;
    }) => Promise<ServerImplementation>,
  ) {}

  private async startServer() {
    const routes = await importRoutes(false);
    await this.createServer({ routes });
  }

  public async start() {
    await this.startServer();
  }
}
