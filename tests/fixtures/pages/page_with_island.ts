import { html } from "htm/preact";
import Counter from "../islands/counter";
import { prepareIsland } from "noxt";

const CounterIsland = await prepareIsland(Counter);

export default function IslandPage() {
  return html`<${CounterIsland} />`;
}
