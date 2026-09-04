import { query } from "noxt";
import * as s from "superstruct";

// GET /api/crash — always throws, exercising the 500 Internal Server Error path.
export const GET = query()
  .input(s.object({}))
  .output(s.object({}))
  .endpoint(() => {
    throw new Error("Demo crash");
  });
