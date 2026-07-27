import type { FunctionComponent } from "preact";
import { getIslandFiles } from "../core/registry";
import { h, Fragment } from "preact";
import { useContext } from "preact/hooks";
import * as devalue from "devalue";
import { toPublicPath } from "../core/rendering";
import { BaseContext, IslandMapContext } from "../core/context";
import { CACHE_DIR } from "./fs";

type Props<T> = h.JSX.IntrinsicAttributes & {
  component: FunctionComponent<T>;
  props: T;
};

export function Island<T>(props: Props<T>) {
  const { component: Component, props: finalProps, key } = props;
  const base = useContext(BaseContext);
  const islandMap = useContext(IslandMapContext);

  const entry = islandMap.get(Component);
  if (!entry) {
    throw new Error(
      `Component "${Component.displayName ?? Component.name}" has not been prerendered as an island. ` +
        "Make sure prerenderIslands() is called before prerenderPages().",
    );
  }

  const scripts = [];
  const cssLinks = [];

  for (const file of getIslandFiles(entry)) {
    const pathFromCache = file.relativeTo(CACHE_DIR);
    if (/.*\.(js|jsx|ts|tsx)$/.test(pathFromCache)) {
      scripts.push(<script src={toPublicPath(pathFromCache, base)}></script>);
    } else if (pathFromCache.endsWith(".css")) {
      cssLinks.push(
        <link rel="stylesheet" href={toPublicPath(pathFromCache, base)}></link>,
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
