import { html } from "htm/preact";
import type { ComponentChildren } from "preact";
import Counter from "../islands/counter";
import { prepareIsland } from "noxt";

const CounterIsland = await prepareIsland(Counter);

export default function Layout({ children }: { children: ComponentChildren }) {
  return html`
    <html>
      <head>
        <title>Island Layout</title>
      </head>
      <body>
        <div>COUNTER: <${CounterIsland} /></div>
        <main>${children}</main>
      </body>
    </html>
  `;
}
