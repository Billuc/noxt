import { query } from "noxt/ssr";
import * as s from "superstruct";
import { h } from "preact";

// GET /ssr/search?q=&tags[]=&limit=&published=
// Exercises every searchParams coercion (string / array / number / boolean);
// bad values (e.g. ?limit=abc) yield 400 Bad argument.
export const GET = query()
  .input(
    s.object({
      q: s.optional(s.string()),
      tags: s.optional(s.array(s.string())),
      limit: s.optional(s.number()),
      published: s.optional(s.boolean()),
    }),
  )
  .route(({ input }) =>
    h(
      "ul",
      { class: "ssr-search" },
      [
        h("li", { key: "q" }, `q: ${input.q ?? "(none)"}`),
        h("li", { key: "tags" }, `tags: ${(input.tags ?? []).join(", ") || "(none)"}`),
        h("li", { key: "limit" }, `limit: ${input.limit ?? "(none)"}`),
        h(
          "li",
          { key: "published" },
          `published: ${input.published ?? "(none)"}`,
        ),
      ],
    ),
  );
