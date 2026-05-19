import { prepareManifest } from "noxt" with { type: "macro" };
import { prepareImportMap } from "noxt";

const manifest = await prepareManifest({
  root: "tests/fixtures",
  pagesDir: "pages",
  islandsDir: "islands",
  assetsDir: "assets",
});
const prerenderedRoutes = prepareImportMap(manifest);

Bun.serve({
  port: 2101,
  routes: {
    ...prerenderedRoutes,
  },
});
