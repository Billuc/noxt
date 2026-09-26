import { query, mutation } from "noxt/ssr";
import * as s from "superstruct";
import { h } from "preact";

// GET /ssr/greeting?name= — renders a greeting fragment.
// Missing ?name= yields 400 Bad argument.
export const GET = query()
  .input(s.object({ name: s.string() }))
  .route(({ input }) =>
    h(
      "p",
      { class: "ssr-greeting" },
      `Hello ${input.name}! (rendered server-side)`,
    ),
  );

// POST /ssr/greeting — same fragment via a devalue-encoded mutation body.
export const POST = mutation()
  .input(s.object({ name: s.string() }))
  .route(({ input }) => h("p", { class: "ssr-greeting" }, `Hi again, ${input.name}!`));
