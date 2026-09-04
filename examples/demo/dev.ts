import type { FileChangeInfo } from "node:fs/promises";
import * as fs from "node:fs/promises";

let abortController = new AbortController();

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

async function rebuildAndRestart() {
  abortController.abort();

  console.log("Building...");
  const buildStep = Bun.spawn({
    cmd: ["bun", "./build.ts"],
    stderr: "inherit",
    stdout: "inherit",
  });
  const buildCode = await buildStep.exited;

  if (buildCode === 0) {
    abortController = new AbortController();
    console.log("Starting the server...");
    Bun.spawn({
      cmd: ["bun", "./serve.ts"],
      stderr: "inherit",
      stdout: "inherit",
      signal: abortController.signal,
    });
  }
}

async function onFileChange(fc: FileChangeInfo<string>) {
  console.log(
    fc.filename +
      " changed ! Rebuilding the project and restarting the server...",
  );
  await rebuildAndRestart();
}

async function startWatch() {
  await rebuildAndRestart();
  const watcher = fs.watch("src", {
    recursive: true,
    ignore: [".cache", "dist"],
  });
  const onEvent = debounceEvent(onFileChange, 200);

  for await (const ev of watcher) {
    onEvent(ev);
  }
}

startWatch();
console.log("Dev server started !\n");
