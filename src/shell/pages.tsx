import * as path from "node:path";
import type { FunctionComponent } from "preact";
import { addAssetRoute, getIslandEntry, getIslandFiles } from "../core/registry";
import { h, Fragment } from "preact";
import * as devalue from "devalue";
import { copyFile } from "./fs";
import { RelativePath } from "../core/fs";
import { toPublicPath } from "../core/rendering";

export async function importAsset(sourcePath: string): Promise<string> {
  const absPath = path.resolve(sourcePath);
  const filename = path.basename(absPath);
  const destPath = path.join(".cache", "assets", filename);
  const publicPath = `/.cache/assets/${filename}`;

  await copyFile(absPath, destPath);
  addAssetRoute(publicPath, RelativePath.fromCwd(destPath));
  console.log(`Copied asset ${sourcePath} -> .cache/assets/${filename}`);

  return publicPath;
}

type Props<T> = h.JSX.IntrinsicAttributes & {
  component: FunctionComponent<T>;
  props: T;
};

export function Island<T>(props: Props<T>) {
  const { component: Component, props: finalProps, key } = props;

  const entry = getIslandEntry(Component);
  if (!entry) {
    throw new Error(
      `Component "${Component.displayName ?? Component.name}" has not been prerendered as an island. ` +
      "Make sure prerenderIslands() is called before prerenderPages().",
    );
  }

  const scripts = [];
  const cssLinks = [];

  for (const file of getIslandFiles(entry)) {
    if (/.*\.(js|jsx|ts|tsx)$/.test(file.fromRoot)) {
      scripts.push(<script src={toPublicPath(file.fromRoot)}></script>);
    } else if (file.fromRoot.endsWith(".css")) {
      cssLinks.push(
        <link rel="stylesheet" href={toPublicPath(file.fromRoot)}></link>,
      );
    }
  }

  return (
    <>
      <div data-island={entry.hash} data-props={devalue.stringify(finalProps)}>
        <Component key={key} {...finalProps} />
      </div>
      {scripts}
      {cssLinks}
    </>
  );
}
