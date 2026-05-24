import { html } from "htm/preact";
import Counter from "../islands/counter";
import { Island } from "noxt";

export default function IslandPage() {
  return html`<${Island} component=${Counter} props=${{}} />`;
}
