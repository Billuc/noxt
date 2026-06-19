import { html } from "htm/preact";
import type { ComponentChildren } from "preact";
import Counter from "../islands/counter";
import { useIsland } from "noxt";

const CounterIsland = useIsland(Counter);

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
