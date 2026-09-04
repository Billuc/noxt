import { h } from "preact";

// No default export on purpose: prerenderPreactPages() must log an error
// and skip this file without aborting the other pages.
export function brokenHelper(): string {
  return `demo:Error`;
}
