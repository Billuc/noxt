import { useState } from "preact/hooks";
import { html } from "htm/preact";
import { defineIsland } from "noxt";

function Counter() {
  const [count, setCount] = useState(0);
  return html`<button onClick=${() => setCount((c) => c + 1)}>
    ${count}
  </button>`;
}

export default defineIsland(Counter, import.meta.path);
