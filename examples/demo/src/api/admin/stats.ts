import { query } from "noxt";
import * as s from "superstruct";

// GET /api/admin/stats — nested route (src/api/admin/stats.ts -> /api/admin/stats).
export const GET = query()
  .input(s.object({}))
  .output(s.object({ uptime: s.number(), hello: s.string() }))
  .endpoint(() => ({ uptime: Math.round(process.uptime()), hello: "noxt" }));
