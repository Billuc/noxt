import { readFile, Path } from "./fs";
import type { NoxtServer, RouteHandlers, ServerImplementation } from "./types";
import { watch } from "node:fs/promises";
import { debounce } from "./utils";
import type { FileChangeInfo } from "node:fs/promises";
import { lookup } from "mrmime";

class AbortError extends Error {}

async function importRoutes(isDev: boolean): Promise<RouteHandlers<any>> {
  let apiFile = Path.fromCwd(".cache/api.ts").absolute;
  if (isDev) {
    apiFile += "?t=" + performance.now();
  }

  const apis = await import(apiFile);
  const handlers: RouteHandlers<any> = apis.handlers;

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

    const routes = await importRoutes(true);
    this.server = await this.server.reload({ routes });
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
    const routes = await importRoutes(true);
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
