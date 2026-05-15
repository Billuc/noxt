import { buildConfig } from "../../src/core/config";

const TEST_CONFIG = buildConfig({
  root: "tests/fixtures",
  pagesDir: "pages",
  islandsDir: "islands",
  assetsDir: "assets",
});

export { TEST_CONFIG };
