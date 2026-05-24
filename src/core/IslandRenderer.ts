import { html } from "htm/preact";
import { getHash, type IslandComponent } from "./island";

interface Props<T> {
  component: IslandComponent<T>;
  props: T;
}

export default function Island<T>(props: Props<T>) {
  const hash = getHash(props.component);

  return html`<div
      data-island=${hash}
      data-props=${JSON.stringify(props.props)}
    ></div>
    <script src=${"./" + hash + ".js"}></script>`;
}
