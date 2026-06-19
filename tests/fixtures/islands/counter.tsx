import { useState } from "preact/hooks";
import { html } from "htm/preact";

function Counter({
  initialValue = 0,
  date,
}: {
  initialValue?: number;
  date?: Date;
}) {
  const [count, setCount] = useState(initialValue);
  const dateLabel = date?.toLocaleString() ?? "undefined";
  return html`
    <button onClick=${() => setCount((c) => c + 1)}>${count}</button>
    <div>Prepared at ${dateLabel}</div>
  `;
}

export default Counter;
