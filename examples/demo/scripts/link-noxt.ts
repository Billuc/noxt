/**
 * Links the local noxt workspace root into node_modules.
 *
 * A `file:../..` dependency cannot be used: Bun copies `file:` dependencies
 * through its cache and that copy fails on Windows (EPERM) — the `backend`
 * option does not apply to them. A junction avoids the copy entirely. Bun
 * resolves `noxt`, `noxt/runtime` and `noxt/api` through this link via the
 * root package.json `exports` map.
 */
import fs from "node:fs";
import path from "node:path";

const demoDir = path.resolve(import.meta.dir, "..");
const linkPath = path.join(demoDir, "node_modules", "noxt");
const targetPath = path.resolve(demoDir, "..", "..");

if (fs.existsSync(linkPath) && !fs.lstatSync(linkPath).isSymbolicLink()) {
  // Leftover partial copy from a `file:` install — remove it first.
  fs.rmSync(linkPath, { recursive: true, force: true });
}

if (!fs.existsSync(linkPath)) {
  fs.symlinkSync(targetPath, linkPath, "junction");
  console.log(`Linked noxt -> ${targetPath}`);
} else {
  console.log(`noxt link already present`);
}
