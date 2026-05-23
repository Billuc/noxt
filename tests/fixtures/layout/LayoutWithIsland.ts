import { html } from "htm/preact";
import type { ComponentChildren } from "preact";
import Counter from "../islands/counter";

export default function Layout({ children }: { children: ComponentChildren }) {
  return html`
    <html>
      <head>
        <title>Island Layout</title>
      </head>
      <body>
        <div>COUNTER: <${Counter} /></div>
        <main>${children}</main>
      </body>
    </html>
  `;
}
