import { html } from "htm/preact";
import { link, asset } from "../.cache/utils";

export default function IndexPage() {
  return html`
    <h1>Index Page</h1>
    <img src="${asset("/test.png")}" alt="Test" />
    <br />
    <a href="${link("/sample")}">Sample Page</a><br />
    <a href="${link("/sample2")}">Sample Page #2</a><br />
    <a href="${link("/markdown")}">Markdown Page</a><br />
    <a href="${link("/markdown_with_layout")}">Markdown With Layout Page</a><br />
    <a href="${link("/markdown_with_island_layout")}">Markdown With Island Layout Page</a
    ><br />
    <a href="${link("/page_with_island")}">Island Page</a><br />
    <a href="${link("/nested/post1")}">Nested Page</a><br />
  `;
}
