import { query } from "noxt/ssr";

// GET /ssr/crash — always throws, exercising the 500 Internal Server Error path.
export const GET = query().route(() => {
  throw new Error("Demo SSR crash");
});
