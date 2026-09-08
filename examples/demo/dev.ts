import type { FileChangeInfo } from "node:fs/promises";
import * as fs from "node:fs/promises";

let abortController = new AbortController();
let server: Bun.Server<any>;

// TODO : creer un Server Builder qui permet de créer un serveur de dev ou de prod
class AbortError extends Error {}

async function buildProject(): Promise<void> {
  abortController.abort();
  abortController = new AbortController();

  console.log("Building...");
  const buildStep = Bun.spawn({
    cmd: ["bun", "./build.ts"],
    stderr: "inherit",
    stdout: "inherit",
    signal: abortController.signal,
  });
  const buildCode = await buildStep.exited;

  if (buildStep.signalCode === "SIGTERM") {
    throw new AbortError("Aborted !");
  }
  if (buildCode !== 0) {
    throw new Error("Build failed !");
  }
}

async function importRoutes(): Promise<Bun.Serve.Routes<any, any>> {
  const { handlers } = await import(`./.cache/api.ts?t=${Bun.nanoseconds()}`);
  const routeMap = (await Bun.file("./.cache/routes.json").json()) as Record<
    string,
    string
  >;

  const routes: Record<string, Response> = {};
  for (const [url, file] of Object.entries(routeMap)) {
    routes[url] = new Response(Bun.file(file));
  }

  return {
    ...handlers,
    ...routes,
  };
}

async function startServer(base: string, port: number) {
  const routes = await importRoutes();

  const server = Bun.serve({
    port,
    routes,
    development: true,
  });

  console.log(
    `Demo serving at http://localhost:${port}${base} (${Object.keys(routes).length} routes)`,
  );
  return server;
}

async function restartServer(server: Bun.Server<any>) {
  const routes = await importRoutes();

  return server.reload({ routes });
}

function debounceEvent<T>(
  onEvent: (ev: T) => Promise<any> | any,
  ms: number = 100,
): (ev: T) => void {
  let callTask: NodeJS.Timeout | undefined = undefined;

  return (ev: T) => {
    if (callTask) {
      clearTimeout(callTask);
    }
    callTask = setTimeout(() => {
      onEvent(ev);
      callTask = undefined;
    }, ms);
  };
}

async function onFileChange(fc: FileChangeInfo<string>) {
  console.log(
    fc.filename +
      " changed ! Rebuilding the project and restarting the server...",
  );
  try {
    await buildProject();
  } catch (err) {
    if (!(err instanceof AbortError)) throw err;
    return;
  }
  await restartServer(server);
}

async function startWatch() {
  const base = Bun.env.NOXT_BASE ?? "";
  const port = Number(Bun.env.PORT ?? 3000);

  await buildProject();
  server = await startServer(base, port);

  const watcher = fs.watch("src", {
    recursive: true,
  });
  const onEvent = debounceEvent(onFileChange, 200);

  for await (const ev of watcher) {
    onEvent(ev);
  }
}

console.log("Dev server started !\n");
startWatch();
