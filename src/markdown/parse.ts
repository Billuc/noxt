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
import * as yaml from "yaml";
import type { MarkdownData } from "./types";

function parseFrontmatter(frontmatterContent: string): Record<string, any> {
  try {
    const frontmatterData = yaml.parse(frontmatterContent);
    return frontmatterData instanceof Object ? frontmatterData : {};
  } catch {
    return {};
  }
}

/** Parses a markdown string into frontmatter data and body content. */
export function parseMarkdown(markdown: string): MarkdownData {
  markdown = markdown.replaceAll("\r\n", "\n");
  if (!markdown.startsWith("---\n")) {
    return {
      frontmatter: {},
      content: markdown,
    };
  }

  const frontmatterEnd = markdown.indexOf("---\n", 4);
  if (!frontmatterEnd || frontmatterEnd < 0) {
    return {
      frontmatter: {},
      content: markdown,
    };
  }

  const frontmatterContent = markdown.slice(4, frontmatterEnd);
  const markdownContent = markdown.slice(frontmatterEnd + 4);

  return {
    frontmatter: parseFrontmatter(frontmatterContent),
    content: markdownContent,
  };
}
