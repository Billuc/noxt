import { html } from "htm/preact";

export default function IndexPage() {
  return html`
    <h1>Index Page</h1>
    <br />
    <a href="./sample">Sample Page</a><br />
    <a href="./sample2">Sample Page #2</a><br />
    <a href="./markdown">Markdown Page</a><br />
    <a href="./markdown_with_layout">Markdown With Layout Page</a><br />
    <a href="./markdown_with_island_layout">Markdown With Island Layout Page</a
    ><br />
    <a href="./page_with_island">Island Page</a><br />
    <a href="./nested/post1">Nested Page</a><br />
  `;
}
