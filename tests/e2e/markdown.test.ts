/**
 * Copyright 2026 Luc BILLAUD
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 **/

/**
 * E2E: Markdown Pages
 *
 * Feature (src/markdown/*):
 *   Markdown pages are `*.md` files under `src/pages/` discovered by
 *   `discoverMarkdownPages` (src/markdown/build.ts) via glob `** /*.md` under
 *   `src/pages`; missing pages directory logs `No pages directory found !` and
 *   returns []. `prerenderMarkdownPages({ markdownFiles, base, islands, asset, page })`
 *   iterates files, derives `url = getRouteName(file.relativeTo(PAGES_DIR))`
 *   (src/core/utils.ts: strips extension, handles `index` → `/`), logs
 *   `Prerendering page [url]`, and calls `prerenderMarkdown`. That function reads
 *   the file, hashes `markdownPath` via `crypto.hash("sha256", markdownPath, "base64url")`,
 *   writes `.cache/<basename>.<hash>.html`, parses via `parseMarkdown`
 *   (src/markdown/parse.ts: normalizes `\r\n`, extracts `---\n` frontmatter,
 *   `yaml.parse`, fallback to `{}` on error, body after second `---\n`), then
 *   `renderMarkdownToHtml` (src/markdown/render.ts) which `await getLayout(frontmatter)`
 *   (src/markdown/layout.ts: if `frontmatter.layout` absent returns `DefaultMarkdownLayout`
 *   (`<html><head/><body>{children}</body></html>`), else `path.resolve(layoutPath)` +
 *   dynamic import of default export, throws `does not have a default layout export` if missing),
 *   converts body via `micromark`, wraps with `providePageContext({ base, islands, asset, page }, h(Layout, frontmatter, MARKDOWN_PLACEHOLDER))`,
 *   renders via `renderToHtmlString` (src/core/render.ts with errorBoundaries) →
 *   `sanitizePrerendered` (prepends `<!DOCTYPE html>` if starts with `<html>` else
 *   unescapes `&amp;/&lt;/&quot;`), replaces `---MARKDOWN:CHILDREN---` with markdownHTML,
 *   and prefixes `<!DOCTYPE html>`. Errors per file are caught, logged + `Skipping`.
 *
 * What should be tested:
 *   - Discovering markdown finds nested `*.md` under `src/pages` and derives urls
 *     via `getRouteName` (e.g. `blog/post.md` → `/blog/post`, `index.md` → `/`).
 *   - `parseMarkdown` correctly handles no frontmatter, valid yaml frontmatter,
 *     missing closing `---`, and `\r\n` normalization.
 *   - `getLayout` returns default layout when `layout` absent and imports the
 *     resolved layout path when present; missing default export throws.
 *   - `renderMarkdownToHtml` renders micromark HTML inside the layout, provides
 *     `base`/`islands`/`asset`/`page` via `PageContext`, sanitizes, and replaces
 *     the placeholder without double-escaping.
 *   - `prerenderMarkdownPages` writes one hashed HTML per file to `.cache/`,
 *     skips files that throw, and returns `markdownPages: MarkdownPage[] { url, file }`.
 *   - Hash is derived from absolute path (not content) via `sha256` base64url.
 */

