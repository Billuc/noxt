import { mutation, query } from "noxt";
import * as s from "superstruct";

const Entry = s.object({
  id: s.number(),
  name: s.string(),
  message: s.string(),
  at: s.string(),
});

const entries: s.Infer<typeof Entry>[] = [
  { id: 1, name: "Ada", message: "First signature!", at: new Date().toISOString() },
];

// GET /api/guestbook?limit= — query endpoint on the same file as POST,
// exercising per-file grouping in .cache/api.ts codegen.
export const GET = query()
  .input(s.object({ limit: s.optional(s.number()) }))
  .output(s.object({ entries: s.array(Entry) }))
  .endpoint(({ input }) => ({ entries: entries.slice(0, input.limit ?? 20) }));

// POST /api/guestbook — mutation endpoint reading a JSON body.
// Missing fields or invalid JSON yield 400; success sets status 201.
export const POST = mutation()
  .input(s.object({ name: s.string(), message: s.string() }))
  .output(Entry)
  .endpoint(({ input, response }) => {
    const entry = {
      id: entries.length + 1,
      ...input,
      at: new Date().toISOString(),
    };
    entries.push(entry);
    response.status = 201;
    return entry;
  });
