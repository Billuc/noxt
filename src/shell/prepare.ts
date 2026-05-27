import {
  renderPageToHtml,
  parseMarkdown,
  renderMarkdownToHtml,
} from "../core/rendering";
import path, { basename } from "node:path";
import { readFile, writeFile } from "./fs";
import type {
  ComponentChildren,
  ComponentType,
  FunctionComponent,
} from "preact";
import { html } from "htm/preact";

export async function preparePreact(
  Page: FunctionComponent<any>,
): Promise<string> {
  const pageHash = new Bun.CryptoHasher("sha256")
    .update(Page.toString())
    .digest("base64url");
  const fileName = (Page.displayName ?? Page.name) + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const prerenderedPage = await renderPageToHtml(Page);
  await writeFile(prerenderPath, prerenderedPage);

  return prerenderPath;
}

export async function prepareMarkdown(markdownPath: string): Promise<string> {
  const content = await readFile(markdownPath);

  const pageHash = new Bun.CryptoHasher("sha256")
    .update(content)
    .digest("base64url");
  const fileName = basename(markdownPath, ".md") + "." + pageHash + ".html";
  const prerenderPath = path.resolve(".cache", fileName);

  const markdownData = parseMarkdown(content);

  const Layout = await findAndPrepareMarkdownLayout(markdownData.frontmatter);
  if (!Layout)
    throw new Error("Error while preparing layout for page " + markdownPath);

  const prerenderedPage = await renderMarkdownToHtml(markdownData, Layout);
  await writeFile(prerenderPath, prerenderedPage);

  return prerenderPath;
}

function DefaultMarkdownLayout({ children }: { children?: ComponentChildren }) {
  return html`<html>
    <head></head>
    <body>
      ${children}
    </body>
  </html>`;
}

async function findAndPrepareMarkdownLayout(
  frontmatterData: Record<string, any>,
): Promise<ComponentType<Record<string, any>> | null> {
  let layoutPath = frontmatterData["layout"];
  if (!layoutPath) {
    return DefaultMarkdownLayout;
  }

  layoutPath = path.resolve(layoutPath);
  const layoutExports = await import(layoutPath);
  if (!layoutExports || !layoutExports["default"]) return null;

  const Layout = layoutExports["default"];
  return Layout as ComponentType<Record<string, any>>;
}
