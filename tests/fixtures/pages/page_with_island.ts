import { html } from "htm/preact";
import Counter from "../islands/counter";

export default function SamplePage() {
  return html`<${Counter} />`;
}
