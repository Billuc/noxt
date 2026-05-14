import { html } from "htm/preact";
import type { ComponentChildren } from "preact";

export default function Layout({ children }: { children: ComponentChildren }) {
  return html`
    <html>
      <head>
        <title>THIS IS A TEST</title>
      </head>
      <body>
        THIS IS A TEST
        <main>${children}</main>
      </body>
    </html>
  `;
}
