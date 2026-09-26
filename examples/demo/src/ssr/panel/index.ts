import { query } from "noxt/ssr";
import { h } from "preact";

// GET /ssr/panel — index routes shorten: src/ssr/panel/index.ts → /ssr/panel.
export const GET = query().route(() =>
  h("p", { class: "ssr-panel" }, "Static panel fragment"),
);
