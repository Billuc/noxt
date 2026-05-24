import { useState } from "preact/hooks";
import { html } from "htm/preact";
import { prepareIsland } from "noxt";

function Counter() {
  const [count, setCount] = useState(0);
  return html`<button onClick=${() => setCount((c) => c + 1)}>
    ${count}
  </button>`;
}

export default await prepareIsland(Counter, import.meta.path);
