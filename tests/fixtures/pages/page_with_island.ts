import { html } from "htm/preact";
import Counter from "../islands/counter";
import { useIsland } from "noxt";

const CounterIsland = useIsland(Counter);

export default function IslandPage() {
  return html`
    <${CounterIsland} initialValue=${4} date=${new Date()} />
  `;
}
